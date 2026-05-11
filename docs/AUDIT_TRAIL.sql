-- =====================================================================
-- P2.10 — AUDIT TRAIL
-- =====================================================================
-- Generic before/after change log. Triggers on the master tables that
-- materially affect the ledger: customers, products, orders, order_items,
-- receipts, app_settings.
--
-- Recovery / archive events stay in `data_recovery_events` (unchanged).
-- This file adds field-level diffs for routine edits — who changed what,
-- when, from what, to what.
--
-- DOWN at bottom.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_trail (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name  text NOT NULL,
    row_id      text NOT NULL,
    action      text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_by  uuid,
    changed_at  timestamptz NOT NULL DEFAULT NOW(),
    before      jsonb,
    after       jsonb
);

CREATE INDEX IF NOT EXISTS audit_trail_table_row_idx
    ON public.audit_trail (table_name, row_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS audit_trail_changed_by_idx
    ON public.audit_trail (changed_by, changed_at DESC);

ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_trail_admin_read ON public.audit_trail;
DROP POLICY IF EXISTS audit_trail_no_write ON public.audit_trail;
CREATE POLICY audit_trail_admin_read ON public.audit_trail
    FOR SELECT TO authenticated USING (public.is_role('admin'));
-- No client may INSERT/UPDATE/DELETE; only triggers (SECURITY DEFINER) write.
CREATE POLICY audit_trail_no_write ON public.audit_trail
    FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------
-- Trigger function
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_trail_capture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_row_id text;
    v_before jsonb;
    v_after  jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_row_id := COALESCE(NEW.id::text, '');
        v_before := NULL;
        v_after  := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_row_id := COALESCE(NEW.id::text, '');
        v_before := to_jsonb(OLD);
        v_after  := to_jsonb(NEW);
        -- Skip if nothing actually changed (defensive — Postgres still
        -- fires UPDATE triggers when row is touched with same values).
        IF v_before = v_after THEN
            RETURN NEW;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_row_id := COALESCE(OLD.id::text, '');
        v_before := to_jsonb(OLD);
        v_after  := NULL;
    END IF;

    INSERT INTO public.audit_trail (table_name, row_id, action, changed_by, before, after)
    VALUES (TG_TABLE_NAME, v_row_id, TG_OP, auth.uid(), v_before, v_after);

    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ---------------------------------------------------------------------
-- Wire triggers on critical tables. Drop-then-create for idempotency.
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_customers ON public.customers;
CREATE TRIGGER audit_customers
    AFTER INSERT OR UPDATE OR DELETE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.audit_trail_capture();

DROP TRIGGER IF EXISTS audit_products ON public.products;
CREATE TRIGGER audit_products
    AFTER INSERT OR UPDATE OR DELETE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.audit_trail_capture();

DROP TRIGGER IF EXISTS audit_orders ON public.orders;
CREATE TRIGGER audit_orders
    AFTER INSERT OR UPDATE OR DELETE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.audit_trail_capture();

DROP TRIGGER IF EXISTS audit_order_items ON public.order_items;
CREATE TRIGGER audit_order_items
    AFTER INSERT OR UPDATE OR DELETE ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.audit_trail_capture();

DROP TRIGGER IF EXISTS audit_receipts ON public.receipts;
CREATE TRIGGER audit_receipts
    AFTER INSERT OR UPDATE OR DELETE ON public.receipts
    FOR EACH ROW EXECUTE FUNCTION public.audit_trail_capture();

DROP TRIGGER IF EXISTS audit_app_settings ON public.app_settings;
CREATE TRIGGER audit_app_settings
    AFTER INSERT OR UPDATE OR DELETE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION public.audit_trail_capture();

DROP TRIGGER IF EXISTS audit_suppliers ON public.suppliers;
CREATE TRIGGER audit_suppliers
    AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.audit_trail_capture();

COMMIT;

-- =====================================================================
-- DOWN
-- =====================================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS audit_suppliers ON public.suppliers;
-- DROP TRIGGER IF EXISTS audit_app_settings ON public.app_settings;
-- DROP TRIGGER IF EXISTS audit_receipts ON public.receipts;
-- DROP TRIGGER IF EXISTS audit_order_items ON public.order_items;
-- DROP TRIGGER IF EXISTS audit_orders ON public.orders;
-- DROP TRIGGER IF EXISTS audit_products ON public.products;
-- DROP TRIGGER IF EXISTS audit_customers ON public.customers;
-- DROP FUNCTION IF EXISTS public.audit_trail_capture();
-- DROP TABLE IF EXISTS public.audit_trail;
-- COMMIT;
