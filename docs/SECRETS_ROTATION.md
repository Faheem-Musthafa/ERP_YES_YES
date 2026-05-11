# Secrets Rotation Runbook

## When to rotate

- A teammate's machine is lost or compromised.
- `.env` was committed to git or shared outside the team chat.
- An employee with prior access leaves the project.
- After every quarterly review.

## What to rotate

| Secret | Location | Rotation steps |
|---|---|---|
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → `anon public` | Click "Reset". Update `.env` locally. Update Vercel project env vars. Redeploy. The anon key is public-by-design (shipped to the browser) so RLS is the primary defense; rotate anyway to invalidate any compromise. |
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API | Project URL does not change unless project is migrated. |
| `service_role` key (server-side only, NEVER in client) | Supabase Dashboard → Project Settings → API → `service_role` | Reset. Update Supabase edge function env vars only. Never commit. |
| Supabase user passwords | Auth Dashboard | Force password reset for every active user. |

## After rotation

1. `git ls-files .env` — must return nothing. If it returns `.env`, run `git rm --cached .env` and commit.
2. Verify `.gitignore` lines `.env` and `.env.*` exist.
3. Run a smoke login as each role (admin/sales/accounts/inventory/procurement/driver) to confirm the new key works.
4. Check Supabase Auth → URL Configuration → Site URL + Redirect URLs are locked to known origins; remove any stale entries.
5. Tag the rotation in git: `git tag rotate-YYYY-MM-DD -m "Reason: …"`.

## Verifying secrets are not in history

```bash
git log --all --full-history -- .env
# Should print nothing.
git log -p --all | grep -iE 'VITE_SUPABASE_ANON_KEY|service_role|password' | head -50
# Visually scan for any leaks.
```

If `.env` shows up in history, a full repo rewrite (e.g. `git filter-repo`) is required AND the leaked key must be rotated in Supabase before push-force. Coordinate with the team — rewriting history invalidates everyone's local clones.
