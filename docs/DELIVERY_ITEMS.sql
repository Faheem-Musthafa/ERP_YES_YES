-- =====================================================================
-- P2.6 — DELIVERY ITEMS (partial dispatch)
-- =====================================================================
-- Today `deliveries` is 1:1 with `orders` — there is no way to record
-- partial shipment of a multi-line order. This file adds `delivery_items`
-- so a single delivery can include a subset of order_items at a subset
-- of quantity, and an order can have multiple deliveries until the
-- delivered_qty matches the ordered quantity.
--
-- Depends on P2_TAX_SCHEMA_EXTENSIONS.sql (uses order_items.delivered_qty).
-- DOWN at bottom.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.delivery_items (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id   uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
    order_item_id uuid NOT NULL REFERENCES public.order_items(id),
    qty           numeric(14,3) NOT NULL CHECK (qty > 0),
    created_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS delivery_items_delivery_idx ON public.delivery_items (delivery_id);
CREATE INDEX IF NOT EXISTS delivery_items_order_item_idx ON public.delivery_items (order_item_id);

ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS delivery_items_all ON public.delivery_items;
CREATE POLICY delivery_items_all ON public.delivery_items
    FOR ALL TO authenticated
    USING (public.is_role('admin','inventory','driver','accounts'))
    WITH CHECK (public.is_role('admin','inventory','driver','accounts'));

-- Cumulative cap enforced via deferred constraint trigger.
CREATE OR REPLACE FUNCTION public.enforce_delivery_items_cap()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    v_ordered numeric;
    v_total numeric;
BEGIN
    SELECT quantity INTO v_ordered FROM public.order_items WHERE id = NEW.order_item_id;
    IF v_ordered IS NULL THEN
        RAISE EXCEPTION 'order_item % does not exist', NEW.order_item_id;
    END IF;
    SELECT COALESCE(SUM(qty), 0) INTO v_total FROM public.delivery_items WHERE order_item_id = NEW.order_item_id;
    IF v_total > v_ordered THEN
        RAISE EXCEPTION 'Cumulative delivered qty (%) exceeds ordered qty (%) for order_item %', v_total, v_ordered, NEW.order_item_id;
    END IF;
    -- Maintain denormalized counter for fast reporting.
    UPDATE public.order_items SET delivered_qty = v_total WHERE id = NEW.order_item_id;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS delivery_items_cap ON public.delivery_items;
CREATE CONSTRAINT TRIGGER delivery_items_cap
    AFTER INSERT OR UPDATE ON public.delivery_items
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION public.enforce_delivery_items_cap();

-- Recalc on delete too.
CREATE OR REPLACE FUNCTION public.recalc_order_item_delivered_qty()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.order_items oi
    SET delivered_qty = COALESCE(
        (SELECT SUM(qty) FROM public.delivery_items WHERE order_item_id = OLD.order_item_id),
        0
    )
    WHERE oi.id = OLD.order_item_id;
    RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS delivery_items_recalc_after_del ON public.delivery_items;
CREATE TRIGGER delivery_items_recalc_after_del
    AFTER DELETE ON public.delivery_items
    FOR EACH ROW EXECUTE FUNCTION public.recalc_order_item_delivered_qty();

COMMIT;

-- =====================================================================
-- DOWN
-- =====================================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS delivery_items_recalc_after_del ON public.delivery_items;
-- DROP TRIGGER IF EXISTS delivery_items_cap ON public.delivery_items;
-- DROP FUNCTION IF EXISTS public.recalc_order_item_delivered_qty();
-- DROP FUNCTION IF EXISTS public.enforce_delivery_items_cap();
-- DROP TABLE IF EXISTS public.delivery_items;
-- COMMIT;
