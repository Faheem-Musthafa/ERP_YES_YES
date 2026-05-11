-- ============================================================================
-- DEPRECATED SCRIPT - DO NOT RUN
-- ============================================================================
-- This file previously disabled RLS and created permissive policies on `users`
-- including anon read access. That is not safe for production.
--
-- Use this hardened migration instead:
--   docs/SECURITY_TRANSACTION_HARDENING.sql
-- ============================================================================

DO $$
BEGIN
  RAISE EXCEPTION
    'docs/FIX_403_ERROR.sql is deprecated because it weakens users-table security. Run docs/SECURITY_TRANSACTION_HARDENING.sql instead.';
END
$$;
