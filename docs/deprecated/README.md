# Deprecated docs

Everything here has already run against the live Supabase project, was
superseded by a newer migration, or is a one-off feature launch
summary. Do not run anything from this folder.

If you need to understand current state, read:
- `docs/applied/*.sql` for current schema/RPC sources
- Supabase Dashboard → Database → Migrations for the authoritative log
- `docs/README.md` for the layout

## Markers

Two scripts (`FIX_ALL_TABLES_RLS.sql`, `FIX_403_ERROR.sql`) carry a
`DEPRECATED SCRIPT - DO NOT RUN` line that is checked by
`scripts/security-smoke-test.mjs`. Leave the marker in place.
