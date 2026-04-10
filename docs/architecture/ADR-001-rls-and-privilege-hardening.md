# ADR-001: RLS And Privilege Hardening

- Status: Proposed
- Date: 2026-04-10

## Context

Current SQL scripts include broad permissive policies (`USING (true)`, `WITH CHECK (true)`) and wide grants to authenticated users across many tables. Some scripts also grant anon read access for internal identity tables.

This undermines role-based boundaries expected by the ERP domain (admin, sales, accounts, inventory, procurement).

## Decision Drivers

- Prevent horizontal privilege escalation
- Enforce least privilege at database boundary
- Reduce dependence on frontend route guards for security
- Keep Supabase RLS as source of truth

## Options Considered

1. Keep permissive RLS and enforce in frontend only
2. Introduce table-specific RLS by role and actor
3. Move to backend API layer and disable direct table access

## Decision

Adopt option 2 immediately.

Implement table-specific RLS and revoke broad grants. Keep frontend direct Supabase access for now, but with strict policies.

## Consequences

### Positive

- Stronger data-layer security
- Better alignment with role-based workflow boundaries
- Reduced blast radius for compromised user sessions

### Negative

- Initial migration effort and policy testing complexity
- Possible temporary permission errors during rollout

## Implementation Plan

1. Create helper role function:
   - `public.current_user_role()` as `SECURITY DEFINER` with fixed search_path.
2. Replace permissive policies per table with role-and-row-aware checks.
3. Remove anon access from internal tables (`users`, etc).
4. Revoke broad grants and grant only required operations.
5. Add policy regression tests for each role and critical table.

## Validation

- Verify denied access for disallowed role/table combinations.
- Verify allowed operations for intended role flows.
- Run security test matrix before production rollout.
