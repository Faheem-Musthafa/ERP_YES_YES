-- ============================================================================
-- DEPRECATED SCRIPT - DO NOT RUN
-- ============================================================================
-- This file previously created permissive RLS policies (`USING (true)` and
-- `WITH CHECK (true)`) across all tables, which is unsafe for production.
--
-- Use this hardened migration instead:
--   docs/SECURITY_TRANSACTION_HARDENING.sql
-- ============================================================================

DO $$
BEGIN
  RAISE EXCEPTION
    'docs/FIX_ALL_TABLES_RLS.sql is deprecated because it weakens security. Run docs/SECURITY_TRANSACTION_HARDENING.sql instead.';
END
$$;
