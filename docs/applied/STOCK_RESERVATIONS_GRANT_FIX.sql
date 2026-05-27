-- Fix: stock_reservations missing SELECT grant for authenticated.
-- Date: 2026-05-27
-- Symptom: Stock View page errored with
--   "permission denied for table stock_reservations"
-- Root cause: STOCK_RESERVATIONS.sql created the table + RLS policies but
--   never issued GRANT SELECT to the authenticated role. The view
--   v_available_stock uses security_invoker = true, so a SELECT on the view
--   resolves the caller's privileges against the underlying table. Without
--   the GRANT, Postgres rejects the query before RLS even runs.
-- Fix: grant SELECT on the table to authenticated. The existing RLS policy
--   stock_reservations_read still gates which rows are returned by role.

GRANT SELECT ON public.stock_reservations TO authenticated;

-- Idempotency note: GRANT is a no-op if the privilege already exists.
