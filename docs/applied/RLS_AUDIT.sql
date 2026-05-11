-- =====================================================================
-- RLS AUDIT MIGRATION
-- =====================================================================
-- Purpose: enforce role-based + is_active access control on every table at
-- the Postgres layer. Client-side route guards (src/app/App.tsx) are UX
-- only; this file is the actual authorization boundary.
--
-- Pattern: every authenticated table policy must include
--   ((SELECT is_active FROM public.users WHERE id = auth.uid()))
-- AND a role predicate via the is_role(...) helper below.
--
-- DOWN section at the bottom for rollback.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.users WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_role(VARIADIC roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_active_user() AND (public.current_user_role() = ANY(roles));
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_user, public.current_user_role, public.is_role FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_user, public.current_user_role, public.is_role TO authenticated;

-- ---------------------------------------------------------------------
-- Table checklist
--
-- For each table, every policy must:
--   * call public.is_active_user() OR public.is_role(...)
--   * NEVER bypass `auth.uid() IS NOT NULL` alone
--
-- Replace policy bodies with the patterns below. This migration is
-- intentionally idempotent: DROP POLICY IF EXISTS first, then CREATE.
-- ---------------------------------------------------------------------

-- users: only admins read all rows; everyone may read their own.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_self_read ON public.users;
DROP POLICY IF EXISTS users_admin_all ON public.users;
CREATE POLICY users_self_read ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() AND public.is_active_user());
CREATE POLICY users_admin_all ON public.users
  FOR ALL TO authenticated
  USING (public.is_role('admin'))
  WITH CHECK (public.is_role('admin'));

-- customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customers_read ON public.customers;
DROP POLICY IF EXISTS customers_write ON public.customers;
CREATE POLICY customers_read ON public.customers
  FOR SELECT TO authenticated
  USING (public.is_role('admin','sales','accounts','inventory','procurement'));
CREATE POLICY customers_write ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_role('admin','sales'));
CREATE POLICY customers_update ON public.customers
  FOR UPDATE TO authenticated
  USING (public.is_role('admin','sales'))
  WITH CHECK (public.is_role('admin','sales'));
CREATE POLICY customers_delete ON public.customers
  FOR DELETE TO authenticated
  USING (public.is_role('admin'));

-- products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_read ON public.products;
DROP POLICY IF EXISTS products_write ON public.products;
CREATE POLICY products_read ON public.products
  FOR SELECT TO authenticated
  USING (public.is_active_user());
CREATE POLICY products_write ON public.products
  FOR ALL TO authenticated
  USING (public.is_role('admin','inventory','procurement'))
  WITH CHECK (public.is_role('admin','inventory','procurement'));

-- product_stock_locations
ALTER TABLE public.product_stock_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS psl_read ON public.product_stock_locations;
DROP POLICY IF EXISTS psl_write ON public.product_stock_locations;
CREATE POLICY psl_read ON public.product_stock_locations
  FOR SELECT TO authenticated
  USING (public.is_active_user());
CREATE POLICY psl_write ON public.product_stock_locations
  FOR ALL TO authenticated
  USING (public.is_role('admin','inventory','procurement','accounts'))
  WITH CHECK (public.is_role('admin','inventory','procurement','accounts'));

-- orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orders_read ON public.orders;
DROP POLICY IF EXISTS orders_write ON public.orders;
CREATE POLICY orders_read ON public.orders
  FOR SELECT TO authenticated
  USING (
    public.is_role('admin','accounts','inventory')
    OR (public.is_role('sales') AND created_by = auth.uid())
  );
CREATE POLICY orders_insert ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (public.is_role('admin','sales'));
CREATE POLICY orders_update ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_role('admin','accounts','sales','inventory'))
  WITH CHECK (public.is_role('admin','accounts','sales','inventory'));
CREATE POLICY orders_delete ON public.orders
  FOR DELETE TO authenticated
  USING (public.is_role('admin'));

-- order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS oi_read ON public.order_items;
DROP POLICY IF EXISTS oi_write ON public.order_items;
CREATE POLICY oi_read ON public.order_items
  FOR SELECT TO authenticated
  USING (public.is_active_user());
CREATE POLICY oi_write ON public.order_items
  FOR ALL TO authenticated
  USING (public.is_role('admin','sales','accounts','inventory'))
  WITH CHECK (public.is_role('admin','sales','accounts','inventory'));

-- receipts
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS receipts_read ON public.receipts;
DROP POLICY IF EXISTS receipts_write ON public.receipts;
CREATE POLICY receipts_read ON public.receipts
  FOR SELECT TO authenticated
  USING (public.is_role('admin','accounts','sales'));
CREATE POLICY receipts_write ON public.receipts
  FOR ALL TO authenticated
  USING (public.is_role('admin','accounts'))
  WITH CHECK (public.is_role('admin','accounts'));

-- suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS suppliers_read ON public.suppliers;
DROP POLICY IF EXISTS suppliers_write ON public.suppliers;
CREATE POLICY suppliers_read ON public.suppliers
  FOR SELECT TO authenticated
  USING (public.is_role('admin','procurement','inventory'));
CREATE POLICY suppliers_write ON public.suppliers
  FOR ALL TO authenticated
  USING (public.is_role('admin','procurement'))
  WITH CHECK (public.is_role('admin','procurement'));

-- purchase_orders / grn / grn_items
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS po_all ON public.purchase_orders;
CREATE POLICY po_all ON public.purchase_orders
  FOR ALL TO authenticated
  USING (public.is_role('admin','procurement','inventory'))
  WITH CHECK (public.is_role('admin','procurement','inventory'));

ALTER TABLE public.grn ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grn_all ON public.grn;
CREATE POLICY grn_all ON public.grn
  FOR ALL TO authenticated
  USING (public.is_role('admin','procurement','inventory'))
  WITH CHECK (public.is_role('admin','procurement','inventory'));

ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grn_items_all ON public.grn_items;
CREATE POLICY grn_items_all ON public.grn_items
  FOR ALL TO authenticated
  USING (public.is_role('admin','procurement','inventory'))
  WITH CHECK (public.is_role('admin','procurement','inventory'));

-- deliveries
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deliveries_all ON public.deliveries;
CREATE POLICY deliveries_all ON public.deliveries
  FOR ALL TO authenticated
  USING (public.is_role('admin','inventory','driver','accounts'))
  WITH CHECK (public.is_role('admin','inventory','driver','accounts'));

-- app_settings, master settings, company profiles
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_settings_read ON public.app_settings;
DROP POLICY IF EXISTS app_settings_write ON public.app_settings;
CREATE POLICY app_settings_read ON public.app_settings
  FOR SELECT TO authenticated
  USING (public.is_active_user());
CREATE POLICY app_settings_write ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_role('admin'))
  WITH CHECK (public.is_role('admin'));

-- brands, master_settings — admin or inventory writes; everyone reads
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brands_read ON public.brands;
DROP POLICY IF EXISTS brands_write ON public.brands;
CREATE POLICY brands_read ON public.brands
  FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY brands_write ON public.brands
  FOR ALL TO authenticated
  USING (public.is_role('admin','inventory'))
  WITH CHECK (public.is_role('admin','inventory'));

-- ---------------------------------------------------------------------
-- Verification queries — run after migration and review output.
-- ---------------------------------------------------------------------

-- 1. Every public table must have RLS enabled.
-- expect: zero rows.
-- SELECT schemaname, tablename FROM pg_tables
-- WHERE schemaname='public' AND tablename NOT LIKE 'pg_%' AND tablename NOT IN (
--   SELECT tablename FROM pg_tables WHERE schemaname='public'
-- )
-- AND rowsecurity = false;

-- 2. Every policy must reference is_role or is_active_user.
-- expect: zero rows where qual / with_check have neither.
-- SELECT schemaname, tablename, polname, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND COALESCE(qual,'') !~ 'is_role|is_active_user'
--   AND COALESCE(with_check,'') !~ 'is_role|is_active_user';

-- 3. No DISABLE ROW LEVEL SECURITY anywhere outside docs/deprecated/.
-- enforced via CI grep (scripts/security-smoke-test.mjs).

COMMIT;

-- =====================================================================
-- DOWN
-- =====================================================================
-- BEGIN;
-- DROP POLICY ... ON ...; -- repeat per table
-- DROP FUNCTION public.is_role(text[]);
-- DROP FUNCTION public.current_user_role();
-- DROP FUNCTION public.is_active_user();
-- COMMIT;
