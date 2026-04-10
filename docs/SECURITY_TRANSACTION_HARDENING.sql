-- ============================================================================
-- SECURITY + TRANSACTION HARDENING MIGRATION
-- ============================================================================
-- Apply this in Supabase SQL Editor for production hardening.
-- This migration focuses on:
-- 1) Least-privilege role enforcement in critical RPCs
-- 2) Concurrency-safe document number generators (sequence-backed)
-- 3) Atomic order approval flow
-- 4) Baseline RLS hardening for sensitive tables
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Helper role functions
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.role
  FROM users u
  WHERE u.id = auth.uid()
    AND u.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION has_role(p_roles user_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(current_user_role() = ANY(p_roles), false);
$$;

GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(user_role[]) TO authenticated;

-- ----------------------------------------------------------------------------
-- Concurrency-safe document number generators
-- ----------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS order_number_seq;
CREATE SEQUENCE IF NOT EXISTS delivery_number_seq;
CREATE SEQUENCE IF NOT EXISTS grn_number_seq;
CREATE SEQUENCE IF NOT EXISTS po_number_seq;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

SELECT setval(
  'order_number_seq',
  COALESCE((
    SELECT MAX(
      CASE
        WHEN split_part(order_number, '-', 2) = TO_CHAR(NOW(), 'YY')
             AND split_part(order_number, '-', 3) ~ '^[0-9]+$'
        THEN split_part(order_number, '-', 3)::bigint
        ELSE NULL
      END
    )
    FROM orders
  ), 0) + 1,
  false
);

SELECT setval(
  'delivery_number_seq',
  COALESCE((
    SELECT MAX(
      CASE
        WHEN split_part(delivery_number, '-', 2) = TO_CHAR(NOW(), 'YY')
             AND split_part(delivery_number, '-', 3) ~ '^[0-9]+$'
        THEN split_part(delivery_number, '-', 3)::bigint
        ELSE NULL
      END
    )
    FROM deliveries
  ), 0) + 1,
  false
);

SELECT setval(
  'grn_number_seq',
  COALESCE((
    SELECT MAX(
      CASE
        WHEN split_part(grn_number, '-', 2) = TO_CHAR(NOW(), 'YY')
             AND split_part(grn_number, '-', 3) ~ '^[0-9]+$'
        THEN split_part(grn_number, '-', 3)::bigint
        ELSE NULL
      END
    )
    FROM grn
  ), 0) + 1,
  false
);

SELECT setval(
  'po_number_seq',
  COALESCE((
    SELECT MAX(
      CASE
        WHEN split_part(po_number, '-', 2) = TO_CHAR(NOW(), 'YY')
             AND split_part(po_number, '-', 3) ~ '^[0-9]+$'
        THEN split_part(po_number, '-', 3)::bigint
        ELSE NULL
      END
    )
    FROM purchase_orders
  ), 0) + 1,
  false
);

SELECT setval(
  'invoice_number_seq',
  COALESCE((
    SELECT MAX(
      CASE
        WHEN split_part(invoice_number, '-', 3) ~ '^[0-9]+$'
        THEN split_part(invoice_number, '-', 3)::bigint
        ELSE NULL
      END
    )
    FROM orders
    WHERE invoice_number IS NOT NULL
  ), 0) + 1,
  false
);

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := TO_CHAR(NOW(), 'YY');
  v_next bigint := nextval('order_number_seq');
BEGIN
  RETURN 'ORD-' || v_year || '-' || LPAD(v_next::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION generate_delivery_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := TO_CHAR(NOW(), 'YY');
  v_next bigint := nextval('delivery_number_seq');
BEGIN
  RETURN 'DEL-' || v_year || '-' || LPAD(v_next::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION generate_grn_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := TO_CHAR(NOW(), 'YY');
  v_next bigint := nextval('grn_number_seq');
BEGIN
  RETURN 'GRN-' || v_year || '-' || LPAD(v_next::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := TO_CHAR(NOW(), 'YY');
  v_next bigint := nextval('po_number_seq');
BEGIN
  RETURN 'PO-' || v_year || '-' || LPAD(v_next::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION generate_invoice_number(p_company company_enum)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_code text;
  v_year text := TO_CHAR(NOW(), 'YY');
  v_next bigint := nextval('invoice_number_seq');
BEGIN
  v_company_code := CASE p_company
    WHEN 'YES YES' THEN 'YY'
    WHEN 'LLP' THEN 'LLP'
    WHEN 'Zekon' THEN 'ZK'
    ELSE 'INV'
  END;

  RETURN v_company_code || '-' || v_year || '-' || LPAD(v_next::text, 5, '0');
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_invoice_number_unique
ON orders (invoice_number)
WHERE invoice_number IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Critical RPC hardening + atomicity
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_order(
  p_company company_enum,
  p_invoice_type invoice_type_enum,
  p_customer_id uuid,
  p_godown godown_enum,
  p_site_address text,
  p_items jsonb,
  p_remarks text DEFAULT NULL,
  p_delivery_date date DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_total_discount numeric := 0;
  v_item_amount numeric;
  v_item_discount numeric;
  v_actor uuid := COALESCE(p_created_by, auth.uid());
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

  v_order_number := generate_order_number();

  INSERT INTO orders (
    order_number, company, invoice_type, customer_id, godown,
    site_address, remarks, delivery_date, created_by, status
  )
  VALUES (
    v_order_number, p_company, p_invoice_type, p_customer_id, p_godown,
    p_site_address, p_remarks, p_delivery_date, v_actor, 'Pending'
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE((v_item->>'quantity')::integer, 0) <= 0 THEN
      RAISE EXCEPTION 'Order item quantity must be > 0';
    END IF;
    IF COALESCE((v_item->>'dealer_price')::numeric, -1) < 0 THEN
      RAISE EXCEPTION 'Order item dealer price must be >= 0';
    END IF;

    v_item_amount := (v_item->>'quantity')::integer * (v_item->>'dealer_price')::numeric;
    v_item_discount := v_item_amount * COALESCE((v_item->>'discount_pct')::numeric, 0) / 100;

    INSERT INTO order_items (order_id, product_id, quantity, dealer_price, discount_pct, amount)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::integer,
      (v_item->>'dealer_price')::numeric,
      COALESCE((v_item->>'discount_pct')::numeric, 0),
      v_item_amount - v_item_discount
    );

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
$$;

CREATE OR REPLACE FUNCTION approve_order_atomic(
  p_order_id uuid,
  p_approved_by uuid,
  p_items jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_subtotal numeric := 0;
  v_total_discount numeric := 0;
  v_grand_total numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_approved_by <> auth.uid() THEN
    RAISE EXCEPTION 'approved_by must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['accounts', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to approve order';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Approved items payload is required';
  END IF;

  PERFORM 1
  FROM orders
  WHERE id = p_order_id AND status = 'Pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or not Pending';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    UPDATE order_items
    SET dealer_price = (v_item->>'dealer_price')::numeric,
        discount_pct = (v_item->>'discount_pct')::numeric,
        amount = (v_item->>'amount')::numeric
    WHERE id = (v_item->>'id')::uuid
      AND order_id = p_order_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid order item in approval payload';
    END IF;
  END LOOP;

  SELECT
    COALESCE(SUM(quantity * dealer_price), 0),
    COALESCE(SUM(quantity * dealer_price * discount_pct / 100), 0),
    COALESCE(SUM(amount), 0)
  INTO v_subtotal, v_total_discount, v_grand_total
  FROM order_items
  WHERE order_id = p_order_id;

  UPDATE orders
  SET status = 'Approved',
      approved_by = p_approved_by,
      approved_at = NOW(),
      subtotal = v_subtotal,
      total_discount = v_total_discount,
      grand_total = v_grand_total,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION reject_order(
  p_order_id uuid,
  p_rejected_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION bill_order_atomic(
  p_order_id uuid,
  p_billed_by uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_item record;
  v_invoice_number text;
  v_current_stock integer;
  v_actor uuid := COALESCE(p_billed_by, auth.uid());
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

  SELECT id, order_number, company, godown, status, invoice_number
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

  v_invoice_number := COALESCE(v_order.invoice_number, generate_invoice_number(v_order.company));

  FOR v_item IN
    SELECT oi.product_id, oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    SELECT stock_qty
    INTO v_current_stock
    FROM product_stock_locations
    WHERE product_id = v_item.product_id
      AND location = COALESCE(v_order.godown, 'Kottakkal')
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      INSERT INTO product_stock_locations (product_id, location, stock_qty)
      VALUES (v_item.product_id, COALESCE(v_order.godown, 'Kottakkal'), 0)
      ON CONFLICT (product_id, location) DO NOTHING;
      v_current_stock := 0;
    END IF;

    IF v_current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product % at % (available %, required %)',
        v_item.product_id,
        COALESCE(v_order.godown, 'Kottakkal'),
        v_current_stock,
        v_item.quantity;
    END IF;

    UPDATE product_stock_locations
    SET stock_qty = stock_qty - v_item.quantity,
        updated_at = NOW()
    WHERE product_id = v_item.product_id
      AND location = COALESCE(v_order.godown, 'Kottakkal');

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
      COALESCE(v_order.godown, 'Kottakkal'),
      v_actor
    );
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
$$;

CREATE OR REPLACE FUNCTION create_stock_adjustment_atomic(
  p_product_id uuid,
  p_location godown_enum,
  p_quantity integer,
  p_type stock_adjustment_type_enum,
  p_reason text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adjustment_id uuid;
  v_current_qty integer;
  v_new_qty integer;
  v_actor uuid := COALESCE(p_user_id, auth.uid());
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'user_id must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['inventory', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to adjust stock';
  END IF;

  SELECT stock_qty
  INTO v_current_qty
  FROM product_stock_locations
  WHERE product_id = p_product_id
    AND location = p_location
  FOR UPDATE;

  IF v_current_qty IS NULL THEN
    INSERT INTO product_stock_locations (product_id, location, stock_qty)
    VALUES (p_product_id, p_location, 0)
    ON CONFLICT (product_id, location) DO NOTHING;
    v_current_qty := 0;
  END IF;

  v_new_qty := CASE
    WHEN p_type = 'Addition' THEN v_current_qty + p_quantity
    ELSE v_current_qty - p_quantity
  END;

  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Stock cannot go below zero at %', p_location;
  END IF;

  INSERT INTO stock_adjustments (product_id, quantity, type, reason, location, adjusted_by)
  VALUES (p_product_id, p_quantity, p_type, p_reason, p_location, v_actor)
  RETURNING id INTO v_adjustment_id;

  UPDATE product_stock_locations
  SET stock_qty = v_new_qty,
      updated_at = NOW()
  WHERE product_id = p_product_id
    AND location = p_location;

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
    p_product_id,
    CASE WHEN p_type = 'Addition' THEN p_quantity ELSE -p_quantity END,
    'adjustment',
    'stock_adjustment',
    v_adjustment_id,
    p_location,
    v_actor
  );

  RETURN v_adjustment_id;
END;
$$;

CREATE OR REPLACE FUNCTION transfer_stock(
  p_product_id uuid,
  p_from_location godown_enum,
  p_to_location godown_enum,
  p_quantity integer,
  p_reason text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_stock integer;
  v_transfer_id uuid;
  v_actor uuid := COALESCE(p_user_id, auth.uid());
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'user_id must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['inventory', 'procurement', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to transfer stock';
  END IF;
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Transfer quantity must be greater than zero';
  END IF;
  IF p_from_location = p_to_location THEN
    RAISE EXCEPTION 'Cannot transfer to same location';
  END IF;

  SELECT stock_qty
  INTO v_from_stock
  FROM product_stock_locations
  WHERE product_id = p_product_id
    AND location = p_from_location
  FOR UPDATE;

  IF v_from_stock IS NULL OR v_from_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock at % (available: %)', p_from_location, COALESCE(v_from_stock, 0);
  END IF;

  INSERT INTO stock_transfers (product_id, from_location, to_location, quantity, reason, transferred_by)
  VALUES (p_product_id, p_from_location, p_to_location, p_quantity, p_reason, v_actor)
  RETURNING id INTO v_transfer_id;

  UPDATE product_stock_locations
  SET stock_qty = stock_qty - p_quantity,
      updated_at = NOW()
  WHERE product_id = p_product_id
    AND location = p_from_location;

  INSERT INTO product_stock_locations (product_id, location, stock_qty)
  VALUES (p_product_id, p_to_location, p_quantity)
  ON CONFLICT (product_id, location)
  DO UPDATE SET stock_qty = product_stock_locations.stock_qty + p_quantity,
                updated_at = NOW();

  INSERT INTO stock_movements (product_id, quantity, movement_type, reference_type, reference_id, location, created_by)
  VALUES
    (p_product_id, -p_quantity, 'transfer_out', 'stock_transfers', v_transfer_id, p_from_location, v_actor),
    (p_product_id, p_quantity, 'transfer_in', 'stock_transfers', v_transfer_id, p_to_location, v_actor);

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION create_delivery(
  p_order_id uuid,
  p_agent_id uuid DEFAULT NULL,
  p_initiated_by uuid DEFAULT NULL,
  p_initiated_by_name text DEFAULT NULL,
  p_driver_name text DEFAULT NULL,
  p_vehicle_number text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_id uuid;
  v_delivery_number text;
  v_agent record;
  v_actor uuid := COALESCE(p_created_by, auth.uid());
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'created_by must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['inventory', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to create delivery';
  END IF;

  v_delivery_number := generate_delivery_number();

  IF p_agent_id IS NOT NULL THEN
    SELECT name, vehicle_number
    INTO v_agent
    FROM delivery_agents
    WHERE id = p_agent_id;
  END IF;

  INSERT INTO deliveries (
    delivery_number,
    order_id,
    initiated_by,
    initiated_by_name,
    delivery_agent_id,
    driver_name,
    vehicle_number,
    status,
    created_by
  )
  VALUES (
    v_delivery_number,
    p_order_id,
    p_initiated_by,
    p_initiated_by_name,
    p_agent_id,
    COALESCE(NULLIF(TRIM(p_driver_name), ''), v_agent.name),
    COALESCE(NULLIF(TRIM(p_vehicle_number), ''), v_agent.vehicle_number),
    'Pending',
    v_actor
  )
  RETURNING id INTO v_delivery_id;

  RETURN v_delivery_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_delivery_status(
  p_delivery_id uuid,
  p_status delivery_status_enum,
  p_failure_reason text DEFAULT NULL,
  p_updated_by uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery record;
  v_item record;
  v_location godown_enum;
  v_actor uuid := COALESCE(p_updated_by, auth.uid());
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'updated_by must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['inventory', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to update delivery status';
  END IF;

  SELECT d.id, d.order_id, d.status AS current_status, o.status AS order_status, COALESCE(o.godown, 'Kottakkal') AS godown
  INTO v_delivery
  FROM deliveries d
  JOIN orders o ON o.id = d.order_id
  WHERE d.id = p_delivery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found: %', p_delivery_id;
  END IF;

  v_location := v_delivery.godown;

  IF p_status = 'Delivered' AND v_delivery.current_status <> 'Delivered' THEN
    IF v_delivery.order_status NOT IN ('Billed', 'Delivered') THEN
      RAISE EXCEPTION 'Order must be Billed before delivery completion';
    END IF;

    FOR v_item IN
      SELECT product_id, quantity
      FROM order_items
      WHERE order_id = v_delivery.order_id
    LOOP
      INSERT INTO product_stock_locations (product_id, location, stock_qty)
      VALUES (v_item.product_id, v_location, 0)
      ON CONFLICT (product_id, location) DO NOTHING;

      UPDATE product_stock_locations
      SET stock_qty = GREATEST(0, stock_qty - v_item.quantity),
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
        'order_delivery',
        'delivery',
        p_delivery_id,
        v_location,
        v_actor
      );
    END LOOP;

    UPDATE orders
    SET status = 'Delivered',
        updated_at = NOW()
    WHERE id = v_delivery.order_id;
  END IF;

  UPDATE deliveries
  SET status = p_status,
      failure_reason = CASE WHEN p_status = 'Failed' THEN p_failure_reason ELSE NULL END,
      dispatched_at = CASE WHEN p_status = 'In Transit' AND dispatched_at IS NULL THEN NOW() ELSE dispatched_at END,
      delivered_at = CASE WHEN p_status = 'Delivered' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END,
      updated_at = NOW()
  WHERE id = p_delivery_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION create_grn(
  p_items jsonb,
  p_po_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_received_by uuid DEFAULT NULL,
  p_remarks text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grn_id uuid;
  v_grn_number text;
  v_item jsonb;
  v_net_qty integer;
  v_actor uuid := COALESCE(p_received_by, auth.uid());
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'received_by must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['procurement', 'inventory', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to create GRN';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one GRN item is required';
  END IF;

  v_grn_number := generate_grn_number();

  INSERT INTO grn (grn_number, po_id, supplier_id, received_by, remarks)
  VALUES (v_grn_number, p_po_id, p_supplier_id, v_actor, p_remarks)
  RETURNING id INTO v_grn_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_net_qty := (v_item->>'received_qty')::integer - COALESCE((v_item->>'damaged_qty')::integer, 0);

    IF v_net_qty < 0 THEN
      RAISE EXCEPTION 'Net GRN quantity cannot be negative';
    END IF;

    INSERT INTO grn_items (
      grn_id,
      purchase_order_id,
      product_id,
      expected_qty,
      received_qty,
      damaged_qty,
      location,
      status,
      received_date
    )
    VALUES (
      v_grn_id,
      p_po_id,
      (v_item->>'product_id')::uuid,
      COALESCE((v_item->>'expected_qty')::integer, 0),
      (v_item->>'received_qty')::integer,
      COALESCE((v_item->>'damaged_qty')::integer, 0),
      (v_item->>'location')::godown_enum,
      'Completed',
      CURRENT_DATE
    );

    INSERT INTO product_stock_locations (product_id, location, stock_qty)
    VALUES ((v_item->>'product_id')::uuid, (v_item->>'location')::godown_enum, v_net_qty)
    ON CONFLICT (product_id, location)
    DO UPDATE SET stock_qty = product_stock_locations.stock_qty + v_net_qty,
                  updated_at = NOW();

    INSERT INTO stock_movements (product_id, quantity, movement_type, reference_type, reference_id, location, created_by)
    VALUES (
      (v_item->>'product_id')::uuid,
      v_net_qty,
      'grn_receipt',
      'grn',
      v_grn_id,
      (v_item->>'location')::godown_enum,
      v_actor
    );
  END LOOP;

  IF p_po_id IS NOT NULL THEN
    UPDATE purchase_orders
    SET status = 'Received',
        delivered_at = NOW(),
        updated_at = NOW()
    WHERE id = p_po_id;
  END IF;

  RETURN v_grn_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_order(company_enum, invoice_type_enum, uuid, godown_enum, text, jsonb, text, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_order_atomic(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_order(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION bill_order_atomic(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_stock_adjustment_atomic(uuid, godown_enum, integer, stock_adjustment_type_enum, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_stock(uuid, godown_enum, godown_enum, integer, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_delivery(uuid, uuid, uuid, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_delivery_status(uuid, delivery_status_enum, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_grn(jsonb, uuid, uuid, uuid, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- Baseline RLS hardening
-- ----------------------------------------------------------------------------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock_locations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
  END LOOP;
END
$$;

CREATE POLICY users_select_self_or_active_or_admin
ON users FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR is_active = true
  OR has_role(ARRAY['admin']::user_role[])
);

CREATE POLICY users_insert_admin
ON users FOR INSERT TO authenticated
WITH CHECK (has_role(ARRAY['admin']::user_role[]));

CREATE POLICY users_update_self_or_admin
ON users FOR UPDATE TO authenticated
USING (id = auth.uid() OR has_role(ARRAY['admin']::user_role[]))
WITH CHECK (id = auth.uid() OR has_role(ARRAY['admin']::user_role[]));

CREATE POLICY users_delete_admin
ON users FOR DELETE TO authenticated
USING (has_role(ARRAY['admin']::user_role[]));

CREATE OR REPLACE FUNCTION enforce_users_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user_role() = 'admin' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR OLD.id <> auth.uid() THEN
    RAISE EXCEPTION 'Only admins can update other users';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
     OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Only admins can update role, active flag, employee id, or email';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_users_update_guard ON users;
CREATE TRIGGER trg_enforce_users_update_guard
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION enforce_users_update_guard();

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON settings', pol.policyname);
  END LOOP;
END
$$;

CREATE POLICY settings_admin_only
ON settings FOR ALL TO authenticated
USING (has_role(ARRAY['admin']::user_role[]))
WITH CHECK (has_role(ARRAY['admin']::user_role[]));

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON orders', pol.policyname);
  END LOOP;
END
$$;

CREATE POLICY orders_select_authenticated
ON orders FOR SELECT TO authenticated
USING (has_role(ARRAY['admin', 'sales', 'accounts', 'inventory', 'procurement']::user_role[]));

CREATE POLICY orders_insert_sales_admin
ON orders FOR INSERT TO authenticated
WITH CHECK (
  has_role(ARRAY['sales', 'admin']::user_role[])
  AND COALESCE(created_by, auth.uid()) = auth.uid()
);

CREATE POLICY orders_update_accounts_inventory_admin
ON orders FOR UPDATE TO authenticated
USING (has_role(ARRAY['accounts', 'inventory', 'admin']::user_role[]))
WITH CHECK (has_role(ARRAY['accounts', 'inventory', 'admin']::user_role[]));

CREATE POLICY orders_delete_admin
ON orders FOR DELETE TO authenticated
USING (has_role(ARRAY['admin']::user_role[]));

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON order_items', pol.policyname);
  END LOOP;
END
$$;

CREATE POLICY order_items_select_authenticated
ON order_items FOR SELECT TO authenticated
USING (has_role(ARRAY['admin', 'sales', 'accounts', 'inventory', 'procurement']::user_role[]));

CREATE POLICY order_items_insert_sales_admin_accounts
ON order_items FOR INSERT TO authenticated
WITH CHECK (has_role(ARRAY['sales', 'accounts', 'admin']::user_role[]));

CREATE POLICY order_items_update_accounts_admin
ON order_items FOR UPDATE TO authenticated
USING (has_role(ARRAY['accounts', 'admin']::user_role[]))
WITH CHECK (has_role(ARRAY['accounts', 'admin']::user_role[]));

CREATE POLICY order_items_delete_admin
ON order_items FOR DELETE TO authenticated
USING (has_role(ARRAY['admin']::user_role[]));

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stock_adjustments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON stock_adjustments', pol.policyname);
  END LOOP;
END
$$;

CREATE POLICY stock_adjustments_select_authenticated
ON stock_adjustments FOR SELECT TO authenticated
USING (has_role(ARRAY['admin', 'inventory', 'accounts', 'procurement']::user_role[]));

CREATE POLICY stock_adjustments_mutation_inventory_admin
ON stock_adjustments FOR ALL TO authenticated
USING (has_role(ARRAY['inventory', 'admin']::user_role[]))
WITH CHECK (has_role(ARRAY['inventory', 'admin']::user_role[]));

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stock_transfers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON stock_transfers', pol.policyname);
  END LOOP;
END
$$;

CREATE POLICY stock_transfers_select_authenticated
ON stock_transfers FOR SELECT TO authenticated
USING (has_role(ARRAY['admin', 'inventory', 'procurement', 'accounts']::user_role[]));

CREATE POLICY stock_transfers_insert_inventory_procurement_admin
ON stock_transfers FOR INSERT TO authenticated
WITH CHECK (has_role(ARRAY['inventory', 'procurement', 'admin']::user_role[]));

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_stock_locations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON product_stock_locations', pol.policyname);
  END LOOP;
END
$$;

CREATE POLICY product_stock_locations_select_authenticated
ON product_stock_locations FOR SELECT TO authenticated
USING (has_role(ARRAY['admin', 'inventory', 'procurement', 'accounts', 'sales']::user_role[]));

CREATE POLICY product_stock_locations_mutation_inventory_admin
ON product_stock_locations FOR ALL TO authenticated
USING (has_role(ARRAY['inventory', 'admin']::user_role[]))
WITH CHECK (has_role(ARRAY['inventory', 'admin']::user_role[]));

REVOKE SELECT ON users FROM anon;

COMMIT;

-- ============================================================================
-- Post-migration verification checklist
-- ============================================================================
-- 1) SELECT current_user_role();
-- 2) Verify only admins can mutate settings/users metadata.
-- 3) Verify sales can create order via RPC but cannot directly approve/bill.
-- 4) Verify accounts can approve/bill and inventory can update delivery status.
-- 5) Verify duplicate document numbers are no longer generated under concurrency.
-- ============================================================================
