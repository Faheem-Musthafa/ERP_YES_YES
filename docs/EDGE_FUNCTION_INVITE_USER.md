# Edge Function — `invite-user`

## Purpose

Creates a new staff user account. Called from `src/app/pages/admin/StaffManagement.tsx` after the admin fills the "Add Staff" form.

## Why a server-side function?

The browser **must not** be trusted to verify "is the caller an admin?". `StaffManagement.tsx` does pre-flight a `select role from users where id = auth.uid()` check before calling, but a malicious authenticated user could call the function directly from the browser console with a forged or modified payload. The edge function is the single source of truth.

## Required server-side checks

Inside the edge function, **independently** verify all of the following before creating any account:

1. **Authentication** — The `Authorization: Bearer <JWT>` header must be present and valid (Supabase auto-injects this when called via `supabase.functions.invoke`).
2. **Caller identity** — Extract `sub` from the JWT (this is the auth user id). Query the `users` table for that id.
3. **Caller is active admin** — The row must have `role = 'admin'` AND `is_active = true`. If not → return `403 Forbidden`.
4. **Payload validation** — `email`, `full_name`, `role` are required. `role` must be one of the allowed roles. `email` must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. `full_name` and `employee_id` must each be ≤ 120 chars after trim.
5. **Rate limit** — Reject more than 10 invites per admin per hour (Supabase function rate-limit config or a custom counter in DB).

## Password handling

- **Generate the password server-side.** Do not accept a password from the request body; if you do, an attacker who bypasses (1)-(4) can set a known password. Use Node `crypto.randomBytes(9).toString('base64url')` plus the same complexity rules as `validatePasswordStrength` in `src/app/validation.ts`.
- Return the generated password **once** in the response. After that, the only path to set it again is the admin "Reset Password" flow (which itself must run through this same authorization gate).
- The current frontend (`StaffManagement.tsx:209`) still generates the password client-side as a defense-in-depth measure (using `unbiasedIndex` / `crypto.getRandomValues` after the P0.5 fix). When the edge function moves to server-side gen, drop the client-side gen and have the function return `{ password: string }`.

## Skeleton

```ts
// supabase/functions/invite-user/index.ts
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ROLES = ['admin', 'sales', 'accounts', 'inventory', 'procurement', 'driver'];

serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Missing auth', { status: 401 });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // 1. Who is calling?
  const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser();
  if (authErr || !caller) return new Response('Unauthorized', { status: 401 });

  // 2. Is the caller an active admin?
  const { data: callerProfile, error: profileErr } = await supabaseAdmin
    .from('users')
    .select('role, is_active')
    .eq('id', caller.id)
    .single();
  if (profileErr || !callerProfile || callerProfile.role !== 'admin' || !callerProfile.is_active) {
    return new Response('Forbidden', { status: 403 });
  }

  // 3. Validate payload.
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const full_name = String(body.full_name ?? '').trim();
  const role = String(body.role ?? '');
  const employee_id = body.employee_id ? String(body.employee_id).trim() : null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new Response('Bad email', { status: 400 });
  if (!full_name || full_name.length > 120) return new Response('Bad name', { status: 400 });
  if (!ALLOWED_ROLES.includes(role)) return new Response('Bad role', { status: 400 });

  // 4. Generate password server-side.
  const password = generateStrongPassword();

  // 5. Create the auth user + the public.users row.
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role, employee_id },
  });
  if (createErr) return new Response(createErr.message, { status: 400 });

  await supabaseAdmin.from('users').insert({
    id: created.user.id,
    email,
    full_name,
    role,
    employee_id,
    is_active: true,
    must_change_password: true,
  });

  return Response.json({ password, user_id: created.user.id });
});

function generateStrongPassword(): string {
  // crypto.getRandomValues + rejection sampling, 12 chars, ≥1 of each class.
  // Mirror the client implementation in src/app/pages/admin/StaffManagement.tsx
  // generatePassword().
  // …
}
```

## Deploying / verifying

- `supabase functions deploy invite-user --no-verify-jwt false` (must verify JWT).
- Manual test:
  1. Log in as admin → click Add Staff → confirm the call succeeds and returns a password.
  2. Log in as a non-admin → open browser console → run `await supabase.functions.invoke('invite-user', { body: { email: 'x@y.z', full_name: 'X', role: 'sales' } })` → must return 403.
  3. Log out → call the function with no Authorization header → must return 401.

## Companion checks

- `StaffManagement.tsx:228-246` calls this function. Keep the client-side pre-flight gate as UX (so the form rejects non-admins before they fill it in), but never rely on it for security.
- `users` table RLS — see `docs/RLS_AUDIT.sql` — must reject INSERT/UPDATE on `users` from anon and non-admin authenticated roles.
