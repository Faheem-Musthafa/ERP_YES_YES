-- Stock Reservations: pending holds for concurrent sales
-- Date: 2026-05-26
-- Reason: multiple sales reps creating orders against the same product can
-- oversell because stock was only checked at billing. Add a reservation row
-- per order_item at create time so the next concurrent create sees the hold
-- and is rejected. Reservations are released on order rejection / void and
-- consumed atomically at billing.

------------------------------------------------------------------------------
-- 1. Table + indexes + RLS
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_reservations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id   uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES public.products(id),
  location        text NOT NULL,
  qty             integer NOT NULL CHECK (qty > 0),
  status          text NOT NULL DEFAULT 'Pending'
                  CHECK (status IN ('Pending','Consumed','Released')),
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  resolved_at     timestamptz,
  resolved_reason text,
  UNIQUE (order_item_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_pending_loc
  ON public.stock_reservations (product_id, location)
  WHERE status = 'Pending';

CREATE INDEX IF NOT EXISTS idx_stock_reservations_order
  ON public.stock_reservations (order_id);

ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_reservations_read ON public.stock_reservations;
CREATE POLICY stock_reservations_read ON public.stock_reservations
  FOR SELECT TO authenticated
  USING (has_role(ARRAY['admin','sales','accounts','inventory','procurement']::user_role[]));

-- Write paths are RPC-only (SECURITY DEFINER bypasses RLS); deny direct writes.
DROP POLICY IF EXISTS stock_reservations_no_insert ON public.stock_reservations;
CREATE POLICY stock_reservations_no_insert ON public.stock_reservations
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS stock_reservations_no_update ON public.stock_reservations;
CREATE POLICY stock_reservations_no_update ON public.stock_reservations
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS stock_reservations_no_delete ON public.stock_reservations;
CREATE POLICY stock_reservations_no_delete ON public.stock_reservations
  FOR DELETE TO authenticated USING (false);

------------------------------------------------------------------------------
-- 2. Available-stock view (frontend reads this for "what can I sell")
------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_available_stock AS
SELECT
  psl.product_id,
  psl.location,
  psl.stock_qty,
  COALESCE(r.reserved_qty, 0)              AS reserved_qty,
  psl.stock_qty - COALESCE(r.reserved_qty, 0) AS available_qty
FROM public.product_stock_locations psl
LEFT JOIN (
  SELECT product_id, location, SUM(qty)::integer AS reserved_qty
  FROM public.stock_reservations
  WHERE status = 'Pending'
  GROUP BY product_id, location
) r USING (product_id, location);

GRANT SELECT ON public.v_available_stock TO authenticated;

-- View must run with caller's RLS, not the creator's, otherwise it bypasses
-- stock_reservations / product_stock_locations policies (Supabase advisor:
-- security_definer_view).
ALTER VIEW public.v_available_stock SET (security_invoker = true);

------------------------------------------------------------------------------
-- 3. create_order: reserve stock + block on insufficient available
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order(
  p_company company_enum,
  p_invoice_type invoice_type_enum,
  p_customer_id uuid,
  p_godown text,
  p_site_address text,
  p_items jsonb,
  p_remarks text DEFAULT NULL,
  p_delivery_date date DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_salesperson_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id        uuid;
  v_order_number    text;
  v_item            jsonb;
  v_subtotal        numeric := 0;
  v_total_discount  numeric := 0;
  v_item_amount     numeric;
  v_item_discount   numeric;
  v_actor           uuid := COALESCE(p_created_by, auth.uid());
  v_godown          text;
  v_salesperson_ok  boolean;
  v_product_id      uuid;
  v_qty             integer;
  v_stock_qty       integer;
  v_reserved_qty    integer;
  v_product_name    text;
  v_order_item_id   uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'created_by must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['sales', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to create order';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one order item is required';
  END IF;
  IF p_salesperson_id IS NULL THEN
    RAISE EXCEPTION 'salesperson is required';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_salesperson_id
      AND role = 'sales'
      AND is_active = true
      AND deleted_at IS NULL
  ) INTO v_salesperson_ok;

  IF NOT v_salesperson_ok THEN
    RAISE EXCEPTION 'salesperson must be an active sales user';
  END IF;

  v_godown := validate_master_setting_option(
    'godowns',
    COALESCE(NULLIF(BTRIM(p_godown), ''), default_master_setting_option('godowns')),
    'godown',
    true
  );

  v_order_number := generate_order_number();

  INSERT INTO orders (
    order_number, company, invoice_type, customer_id, godown,
    site_address, remarks, delivery_date, created_by, salesperson_id, status
  )
  VALUES (
    v_order_number, p_company, p_invoice_type, p_customer_id, v_godown,
    p_site_address, p_remarks, p_delivery_date, v_actor, p_salesperson_id, 'Pending'
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := COALESCE((v_item->>'quantity')::integer, 0);
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Order item quantity must be > 0';
    END IF;
    IF COALESCE((v_item->>'dealer_price')::numeric, -1) < 0 THEN
      RAISE EXCEPTION 'Order item dealer price must be >= 0';
    END IF;

    v_product_id := (v_item->>'product_id')::uuid;

    -- Lock the per-location stock row so concurrent create_order calls
    -- serialise on the same (product, godown) pair.
    SELECT stock_qty INTO v_stock_qty
    FROM product_stock_locations
    WHERE product_id = v_product_id AND location = v_godown
    FOR UPDATE;

    IF v_stock_qty IS NULL THEN
      INSERT INTO product_stock_locations (product_id, location, stock_qty)
      VALUES (v_product_id, v_godown, 0)
      ON CONFLICT (product_id, location) DO NOTHING;
      v_stock_qty := 0;
    END IF;

    SELECT COALESCE(SUM(qty), 0)::integer INTO v_reserved_qty
    FROM stock_reservations
    WHERE product_id = v_product_id
      AND location = v_godown
      AND status = 'Pending';

    IF v_stock_qty - v_reserved_qty < v_qty THEN
      SELECT name INTO v_product_name FROM products WHERE id = v_product_id;
      RAISE EXCEPTION 'Insufficient available stock for "%" at % (stock %, on hold %, requested %)',
        COALESCE(v_product_name, v_product_id::text), v_godown, v_stock_qty, v_reserved_qty, v_qty;
    END IF;

    v_item_amount := v_qty * (v_item->>'dealer_price')::numeric;
    v_item_discount := v_item_amount * COALESCE((v_item->>'discount_pct')::numeric, 0) / 100;

    INSERT INTO order_items (order_id, product_id, quantity, dealer_price, discount_pct, amount)
    VALUES (
      v_order_id,
      v_product_id,
      v_qty,
      (v_item->>'dealer_price')::numeric,
      COALESCE((v_item->>'discount_pct')::numeric, 0),
      v_item_amount - v_item_discount
    )
    RETURNING id INTO v_order_item_id;

    INSERT INTO stock_reservations (order_id, order_item_id, product_id, location, qty)
    VALUES (v_order_id, v_order_item_id, v_product_id, v_godown, v_qty);

    v_subtotal := v_subtotal + v_item_amount;
    v_total_discount := v_total_discount + v_item_discount;
  END LOOP;

  UPDATE orders
  SET subtotal = v_subtotal,
      total_discount = v_total_discount,
      grand_total = v_subtotal - v_total_discount,
      updated_at = NOW()
  WHERE id = v_order_id;

  RETURN v_order_id;
END;
$function$;

------------------------------------------------------------------------------
-- 4. bill_order_atomic: consume reservations atomically with stock decrement
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bill_order_atomic(
  p_order_id uuid,
  p_billed_by uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order record;
  v_item record;
  v_invoice_number text;
  v_current_stock integer;
  v_actor uuid := COALESCE(p_billed_by, auth.uid());
  v_location text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'billed_by must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['accounts', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to bill order';
  END IF;

  SELECT id, order_number, company, invoice_type, godown, remarks, status, invoice_number
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_order.status <> 'Approved' THEN
    IF v_order.status IN ('Billed', 'Delivered') THEN
      RETURN v_order.invoice_number;
    END IF;
    RAISE EXCEPTION 'Order must be Approved to bill. Current status: %', v_order.status;
  END IF;

  v_location := validate_master_setting_option(
    'Godowns',
    COALESCE(NULLIF(BTRIM(v_order.godown), ''), default_master_setting_option('Godowns')),
    'order godown',
    true
  );

  v_invoice_number := COALESCE(
    v_order.invoice_number,
    generate_invoice_number(v_order.company, v_order.invoice_type, v_order.godown, v_order.remarks)
  );

  FOR v_item IN
    SELECT oi.id AS order_item_id, oi.product_id, oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    SELECT stock_qty
    INTO v_current_stock
    FROM product_stock_locations
    WHERE product_id = v_item.product_id
      AND location = v_location
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      INSERT INTO product_stock_locations (product_id, location, stock_qty)
      VALUES (v_item.product_id, v_location, 0)
      ON CONFLICT (product_id, location) DO NOTHING;
      v_current_stock := 0;
    END IF;

    IF v_current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product % at % (available %, required %)',
        v_item.product_id,
        v_location,
        v_current_stock,
        v_item.quantity;
    END IF;

    UPDATE product_stock_locations
    SET stock_qty = stock_qty - v_item.quantity,
        updated_at = NOW()
    WHERE product_id = v_item.product_id
      AND location = v_location;

    INSERT INTO stock_movements (
      product_id,
      quantity,
      movement_type,
      reference_type,
      reference_id,
      location,
      created_by
    )
    VALUES (
      v_item.product_id,
      -v_item.quantity,
      'order_billed',
      'orders',
      p_order_id,
      v_location,
      v_actor
    );

    -- Consume the matching reservation. No-op for orders that predate the
    -- reservation system (backfill covers Pending/Approved at migration time).
    UPDATE stock_reservations
    SET status = 'Consumed',
        resolved_at = NOW(),
        resolved_reason = 'billed'
    WHERE order_item_id = v_item.order_item_id
      AND status = 'Pending';
  END LOOP;

  UPDATE orders
  SET status = 'Billed',
      invoice_number = v_invoice_number,
      billed_by = v_actor,
      billed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN v_invoice_number;
END;
$function$;

------------------------------------------------------------------------------
-- 5. reject_order: release reservations atomically
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_order(
  p_order_id uuid,
  p_rejected_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_updated boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_rejected_by <> auth.uid() THEN
    RAISE EXCEPTION 'rejected_by must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['accounts', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to reject order';
  END IF;

  UPDATE orders
  SET status = 'Rejected',
      approved_by = p_rejected_by,
      approved_at = NOW(),
      remarks = CASE
        WHEN COALESCE(TRIM(p_reason), '') = '' THEN remarks
        ELSE COALESCE(remarks || ' | ', '') || 'Rejected: ' || TRIM(p_reason)
      END,
      updated_at = NOW()
  WHERE id = p_order_id
    AND status = 'Pending';

  v_updated := FOUND;

  IF v_updated THEN
    UPDATE stock_reservations
    SET status = 'Released',
        resolved_at = NOW(),
        resolved_reason = 'rejected'
    WHERE order_id = p_order_id
      AND status = 'Pending';
  END IF;

  RETURN v_updated;
END;
$function$;

------------------------------------------------------------------------------
-- 6. void_order: new RPC for CreateOrder rollback path
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.void_order(
  p_order_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_updated boolean;
  v_current_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT has_role(ARRAY['sales','accounts','admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to void order';
  END IF;

  SELECT status::text INTO v_current_status
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_current_status IN ('Billed','Delivered') THEN
    RAISE EXCEPTION 'Cannot void % order; reverse the billing instead', v_current_status;
  END IF;

  UPDATE orders
  SET status = 'Voided',
      remarks = CASE
        WHEN COALESCE(TRIM(p_reason), '') = '' THEN remarks
        ELSE COALESCE(remarks || ' | ', '') || 'Voided: ' || TRIM(p_reason)
      END,
      updated_at = NOW()
  WHERE id = p_order_id;

  v_updated := FOUND;

  IF v_updated THEN
    UPDATE stock_reservations
    SET status = 'Released',
        resolved_at = NOW(),
        resolved_reason = 'voided'
    WHERE order_id = p_order_id
      AND status = 'Pending';
  END IF;

  RETURN v_updated;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.void_order(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_order(uuid, text) TO authenticated;

------------------------------------------------------------------------------
-- 7. Backfill: one Pending reservation per order_item for orders still
-- Pending/Approved at migration time. Idempotent via UNIQUE(order_item_id).
------------------------------------------------------------------------------
INSERT INTO public.stock_reservations (order_id, order_item_id, product_id, location, qty, status)
SELECT o.id, oi.id, oi.product_id, o.godown, oi.quantity, 'Pending'
FROM public.orders o
JOIN public.order_items oi ON oi.order_id = o.id
WHERE o.status IN ('Pending','Approved')
ON CONFLICT (order_item_id) DO NOTHING;
