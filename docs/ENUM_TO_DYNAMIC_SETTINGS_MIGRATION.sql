-- ============================================================================
-- ENUM TO DYNAMIC SETTINGS MIGRATION
-- ============================================================================
-- Purpose:
-- 1) Remove hardcoded master-data enums from database schema
--    - district_enum
--    - vehicle_type_enum
--    - godown_enum
-- 2) Make master data dynamic via settings table keys:
--    - godowns
--    - districts
--    - vehicle_types
-- 3) Introduce secure CRUD RPCs for Settings page master data management
-- 4) Rebuild transactional RPCs to validate against settings values
--
-- References:
-- PostgreSQL ALTER TABLE: https://www.postgresql.org/docs/current/sql-altertable.html
-- PostgreSQL DROP TYPE:   https://www.postgresql.org/docs/current/sql-droptype.html
-- Supabase Functions:     https://supabase.com/docs/guides/database/functions
-- Supabase RLS:           https://supabase.com/docs/guides/database/postgres/row-level-security
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Seed settings from existing enum labels when available.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_values text[];
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typnamespace = 'public'::regnamespace
      AND t.typname = 'godown_enum'
  ) THEN
    SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
    INTO v_values
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typnamespace = 'public'::regnamespace
      AND t.typname = 'godown_enum';

    INSERT INTO settings (key, value)
    VALUES ('godowns', to_jsonb(COALESCE(v_values, ARRAY[]::text[])))
    ON CONFLICT (key) DO UPDATE
    SET value = CASE
      WHEN settings.value IS NULL
        OR settings.value = '[]'::jsonb
        OR jsonb_typeof(settings.value) <> 'array'
      THEN EXCLUDED.value
      ELSE settings.value
    END,
    updated_at = NOW();
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typnamespace = 'public'::regnamespace
      AND t.typname = 'district_enum'
  ) THEN
    SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
    INTO v_values
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typnamespace = 'public'::regnamespace
      AND t.typname = 'district_enum';

    INSERT INTO settings (key, value)
    VALUES ('districts', to_jsonb(COALESCE(v_values, ARRAY[]::text[])))
    ON CONFLICT (key) DO UPDATE
    SET value = CASE
      WHEN settings.value IS NULL
        OR settings.value = '[]'::jsonb
        OR jsonb_typeof(settings.value) <> 'array'
      THEN EXCLUDED.value
      ELSE settings.value
    END,
    updated_at = NOW();
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typnamespace = 'public'::regnamespace
      AND t.typname = 'vehicle_type_enum'
  ) THEN
    SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
    INTO v_values
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typnamespace = 'public'::regnamespace
      AND t.typname = 'vehicle_type_enum';

    INSERT INTO settings (key, value)
    VALUES ('vehicle_types', to_jsonb(COALESCE(v_values, ARRAY[]::text[])))
    ON CONFLICT (key) DO UPDATE
    SET value = CASE
      WHEN settings.value IS NULL
        OR settings.value = '[]'::jsonb
        OR jsonb_typeof(settings.value) <> 'array'
      THEN EXCLUDED.value
      ELSE settings.value
    END,
    updated_at = NOW();
  END IF;
END
$$;

INSERT INTO settings (key, value)
VALUES
  ('godowns', '[]'::jsonb),
  ('districts', '[]'::jsonb),
  ('vehicle_types', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Drop dependent views before altering enum-backed columns.
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS product_stock_summary;

-- ---------------------------------------------------------------------------
-- Convert enum-based columns to text.
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS customers
  ALTER COLUMN location TYPE text USING location::text;

ALTER TABLE IF EXISTS delivery_agents
  ALTER COLUMN vehicle_type TYPE text USING vehicle_type::text;

ALTER TABLE IF EXISTS orders
  ALTER COLUMN godown TYPE text USING godown::text;

ALTER TABLE IF EXISTS grn_items
  ALTER COLUMN location TYPE text USING location::text;

ALTER TABLE IF EXISTS product_stock_locations
  ALTER COLUMN location TYPE text USING location::text;

ALTER TABLE IF EXISTS stock_adjustments
  ALTER COLUMN location TYPE text USING location::text;

ALTER TABLE IF EXISTS stock_movements
  ALTER COLUMN location TYPE text USING location::text;

ALTER TABLE IF EXISTS stock_transfers
  ALTER COLUMN from_location TYPE text USING from_location::text,
  ALTER COLUMN to_location TYPE text USING to_location::text;

-- ---------------------------------------------------------------------------
-- Security and helper functions for settings-backed master data.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;

CREATE OR REPLACE FUNCTION assert_master_setting_key(p_key text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_key NOT IN ('godowns', 'districts', 'vehicle_types') THEN
    RAISE EXCEPTION 'Unsupported master setting key: %', p_key;
  END IF;
  RETURN p_key;
END;
$$;

CREATE OR REPLACE FUNCTION normalize_master_setting_values(p_values text[])
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(array_agg(v.val ORDER BY v.first_pos), ARRAY[]::text[])
  FROM (
    SELECT cleaned.val, MIN(cleaned.ord) AS first_pos
    FROM (
      SELECT NULLIF(BTRIM(u.val), '') AS val, u.ord
      FROM unnest(COALESCE(p_values, ARRAY[]::text[])) WITH ORDINALITY AS u(val, ord)
    ) AS cleaned
    WHERE cleaned.val IS NOT NULL
    GROUP BY cleaned.val
  ) AS v;
$$;

CREATE OR REPLACE FUNCTION get_master_setting_options(p_key text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := assert_master_setting_key(p_key);
  v_value jsonb;
BEGIN
  SELECT s.value
  INTO v_value
  FROM settings s
  WHERE s.key = v_key
  LIMIT 1;

  IF v_value IS NULL OR jsonb_typeof(v_value) <> 'array' THEN
    RETURN ARRAY[]::text[];
  END IF;

  RETURN normalize_master_setting_values(ARRAY(SELECT jsonb_array_elements_text(v_value)));
END;
$$;

GRANT EXECUTE ON FUNCTION get_master_setting_options(text) TO authenticated;

CREATE OR REPLACE FUNCTION save_master_setting_options(p_key text, p_values text[])
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := assert_master_setting_key(p_key);
  v_clean text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Only admins can manage master settings';
  END IF;

  v_clean := normalize_master_setting_values(p_values);

  IF COALESCE(array_length(v_clean, 1), 0) = 0 THEN
    RAISE EXCEPTION '% must contain at least one option', v_key;
  END IF;

  INSERT INTO settings (key, value, updated_at)
  VALUES (v_key, to_jsonb(v_clean), NOW())
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = NOW();

  RETURN v_clean;
END;
$$;

CREATE OR REPLACE FUNCTION create_master_setting_option(p_key text, p_value text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := assert_master_setting_key(p_key);
  v_value text := NULLIF(BTRIM(p_value), '');
  v_current text[];
BEGIN
  IF v_value IS NULL THEN
    RAISE EXCEPTION 'Value is required';
  END IF;

  v_current := get_master_setting_options(v_key);

  IF v_value = ANY(v_current) THEN
    RAISE EXCEPTION 'Value "%" already exists in %', v_value, v_key;
  END IF;

  RETURN save_master_setting_options(v_key, v_current || v_value);
END;
$$;

CREATE OR REPLACE FUNCTION update_master_setting_option(
  p_key text,
  p_old_value text,
  p_new_value text
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := assert_master_setting_key(p_key);
  v_old text := NULLIF(BTRIM(p_old_value), '');
  v_new text := NULLIF(BTRIM(p_new_value), '');
  v_current text[];
  v_updated text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Only admins can manage master settings';
  END IF;

  IF v_old IS NULL OR v_new IS NULL THEN
    RAISE EXCEPTION 'Both old and new values are required';
  END IF;

  v_current := get_master_setting_options(v_key);

  IF NOT (v_old = ANY(v_current)) THEN
    RAISE EXCEPTION 'Value "%" does not exist in %', v_old, v_key;
  END IF;

  IF v_old <> v_new AND v_new = ANY(v_current) THEN
    RAISE EXCEPTION 'Value "%" already exists in %', v_new, v_key;
  END IF;

  IF v_old <> v_new THEN
    IF v_key = 'godowns' THEN
      UPDATE orders SET godown = v_new WHERE godown = v_old;
      UPDATE grn_items SET location = v_new WHERE location = v_old;
      UPDATE product_stock_locations SET location = v_new WHERE location = v_old;
      UPDATE stock_adjustments SET location = v_new WHERE location = v_old;
      UPDATE stock_movements SET location = v_new WHERE location = v_old;
      UPDATE stock_transfers SET from_location = v_new WHERE from_location = v_old;
      UPDATE stock_transfers SET to_location = v_new WHERE to_location = v_old;
    ELSIF v_key = 'districts' THEN
      UPDATE customers SET location = v_new WHERE location = v_old;
    ELSIF v_key = 'vehicle_types' THEN
      UPDATE delivery_agents SET vehicle_type = v_new WHERE vehicle_type = v_old;
      UPDATE delivery_agents SET vehicle_type_other = v_new WHERE vehicle_type_other = v_old;
    END IF;
  END IF;

  v_updated := ARRAY(
    SELECT CASE WHEN item = v_old THEN v_new ELSE item END
    FROM unnest(v_current) AS item
  );

  RETURN save_master_setting_options(v_key, v_updated);
END;
$$;

CREATE OR REPLACE FUNCTION delete_master_setting_option(p_key text, p_value text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := assert_master_setting_key(p_key);
  v_value text := NULLIF(BTRIM(p_value), '');
  v_current text[];
  v_usage_count bigint := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Only admins can manage master settings';
  END IF;

  IF v_value IS NULL THEN
    RAISE EXCEPTION 'Value is required';
  END IF;

  v_current := get_master_setting_options(v_key);

  IF NOT (v_value = ANY(v_current)) THEN
    RAISE EXCEPTION 'Value "%" does not exist in %', v_value, v_key;
  END IF;

  IF COALESCE(array_length(v_current, 1), 0) <= 1 THEN
    RAISE EXCEPTION '% must keep at least one option', v_key;
  END IF;

  IF v_key = 'godowns' THEN
    SELECT
      (SELECT COUNT(*) FROM orders WHERE godown = v_value)
      + (SELECT COUNT(*) FROM grn_items WHERE location = v_value)
      + (SELECT COUNT(*) FROM product_stock_locations WHERE location = v_value)
      + (SELECT COUNT(*) FROM stock_adjustments WHERE location = v_value)
      + (SELECT COUNT(*) FROM stock_movements WHERE location = v_value)
      + (SELECT COUNT(*) FROM stock_transfers WHERE from_location = v_value OR to_location = v_value)
    INTO v_usage_count;

    IF v_usage_count > 0 THEN
      RAISE EXCEPTION 'Cannot delete godown "%" because it is referenced in % rows', v_value, v_usage_count;
    END IF;
  ELSIF v_key = 'districts' THEN
    SELECT COUNT(*) INTO v_usage_count
    FROM customers
    WHERE location = v_value;

    IF v_usage_count > 0 THEN
      RAISE EXCEPTION 'Cannot delete district "%" because it is referenced by % customers', v_value, v_usage_count;
    END IF;
  ELSIF v_key = 'vehicle_types' THEN
    SELECT COUNT(*) INTO v_usage_count
    FROM delivery_agents
    WHERE vehicle_type = v_value OR vehicle_type_other = v_value;

    IF v_usage_count > 0 THEN
      RAISE EXCEPTION 'Cannot delete vehicle type "%" because it is referenced by % drivers', v_value, v_usage_count;
    END IF;
  END IF;

  RETURN save_master_setting_options(v_key, array_remove(v_current, v_value));
END;
$$;

GRANT EXECUTE ON FUNCTION create_master_setting_option(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_master_setting_option(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_master_setting_option(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION validate_master_setting_option(
  p_key text,
  p_value text,
  p_label text DEFAULT NULL,
  p_required boolean DEFAULT true
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := assert_master_setting_key(p_key);
  v_label text := COALESCE(NULLIF(BTRIM(p_label), ''), p_key);
  v_value text := NULLIF(BTRIM(p_value), '');
  v_allowed text[];
BEGIN
  v_allowed := get_master_setting_options(v_key);

  IF v_value IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION '% is required', v_label;
    END IF;
    RETURN NULL;
  END IF;

  IF NOT (v_value = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid % "%". Configure it in Settings first.', v_label, v_value;
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION default_master_setting_option(p_key text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_options text[];
BEGIN
  v_options := get_master_setting_options(p_key);
  IF COALESCE(array_length(v_options, 1), 0) = 0 THEN
    RETURN NULL;
  END IF;
  RETURN v_options[1];
END;
$$;

-- ---------------------------------------------------------------------------
-- Recreate enum-dependent helper/reporting functions with text-based locations.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS update_stock_at_location(uuid, godown_enum, integer, text, text, uuid);

CREATE OR REPLACE FUNCTION update_stock_at_location(
  p_product_id uuid,
  p_location text,
  p_quantity integer,
  p_operation text,
  p_reason text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location text;
  v_current_qty integer;
  v_new_qty integer;
BEGIN
  v_location := validate_master_setting_option('godowns', p_location, 'location', true);

  SELECT stock_qty INTO v_current_qty
  FROM product_stock_locations
  WHERE product_id = p_product_id
    AND location = v_location
  FOR UPDATE;

  IF v_current_qty IS NULL THEN
    INSERT INTO product_stock_locations (product_id, location, stock_qty)
    VALUES (p_product_id, v_location, 0)
    ON CONFLICT (product_id, location) DO NOTHING;
    v_current_qty := 0;
  END IF;

  CASE p_operation
    WHEN 'add' THEN v_new_qty := v_current_qty + p_quantity;
    WHEN 'subtract' THEN v_new_qty := GREATEST(0, v_current_qty - p_quantity);
    WHEN 'set' THEN v_new_qty := p_quantity;
    ELSE
      RAISE EXCEPTION 'Invalid operation: %', p_operation;
  END CASE;

  UPDATE product_stock_locations
  SET stock_qty = v_new_qty,
      updated_at = NOW()
  WHERE product_id = p_product_id
    AND location = v_location;

  INSERT INTO stock_movements (
    product_id,
    quantity,
    movement_type,
    location,
    created_by
  )
  VALUES (
    p_product_id,
    CASE p_operation
      WHEN 'add' THEN p_quantity
      WHEN 'subtract' THEN -p_quantity
      ELSE v_new_qty - v_current_qty
    END,
    'adjustment',
    v_location,
    p_user_id
  );

  RETURN v_new_qty;
END;
$$;

DROP FUNCTION IF EXISTS create_customer(text, text, text, text, district_enum, text, text, numeric, uuid);

CREATE OR REPLACE FUNCTION create_customer(
  p_name text,
  p_phone text,
  p_address text,
  p_place text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_pincode text DEFAULT NULL,
  p_gst_pan text DEFAULT NULL,
  p_opening_balance numeric DEFAULT 0,
  p_assigned_to uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_location text;
BEGIN
  v_location := validate_master_setting_option('districts', p_location, 'district', false);

  INSERT INTO customers (
    name,
    phone,
    address,
    place,
    location,
    pincode,
    gst_pan,
    opening_balance,
    assigned_to
  )
  VALUES (
    p_name,
    p_phone,
    p_address,
    p_place,
    v_location,
    p_pincode,
    p_gst_pan,
    p_opening_balance,
    p_assigned_to
  )
  RETURNING id INTO v_customer_id;

  RETURN v_customer_id;
END;
$$;

DROP FUNCTION IF EXISTS get_stock_by_location(godown_enum);

CREATE OR REPLACE FUNCTION get_stock_by_location(p_location text DEFAULT NULL)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  sku text,
  brand_name text,
  location text,
  stock_qty integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location text := validate_master_setting_option('godowns', p_location, 'location', false);
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    b.name,
    psl.location,
    psl.stock_qty
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  JOIN product_stock_locations psl ON p.id = psl.product_id
  WHERE p.is_active = true
    AND (v_location IS NULL OR psl.location = v_location)
  ORDER BY p.name, psl.location;
END;
$$;

DROP FUNCTION IF EXISTS get_low_stock_products(integer);

CREATE OR REPLACE FUNCTION get_low_stock_products(p_threshold integer DEFAULT 10)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  sku text,
  location text,
  stock_qty integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    psl.location,
    psl.stock_qty
  FROM products p
  JOIN product_stock_locations psl ON p.id = psl.product_id
  WHERE p.is_active = true
    AND psl.stock_qty <= p_threshold
  ORDER BY psl.stock_qty ASC, p.name;
END;
$$;

-- ---------------------------------------------------------------------------
-- Recreate transactional RPCs to validate location values from settings.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS create_order(company_enum, invoice_type_enum, uuid, godown_enum, text, jsonb, text, date, uuid);

CREATE OR REPLACE FUNCTION create_order(
  p_company company_enum,
  p_invoice_type invoice_type_enum,
  p_customer_id uuid,
  p_godown text,
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
  v_godown text;
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

  v_godown := validate_master_setting_option(
    'godowns',
    COALESCE(NULLIF(BTRIM(p_godown), ''), default_master_setting_option('godowns')),
    'godown',
    true
  );

  v_order_number := generate_order_number();

  INSERT INTO orders (
    order_number,
    company,
    invoice_type,
    customer_id,
    godown,
    site_address,
    remarks,
    delivery_date,
    created_by,
    status
  )
  VALUES (
    v_order_number,
    p_company,
    p_invoice_type,
    p_customer_id,
    v_godown,
    p_site_address,
    p_remarks,
    p_delivery_date,
    v_actor,
    'Pending'
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

  v_location := validate_master_setting_option(
    'godowns',
    COALESCE(NULLIF(BTRIM(v_order.godown), ''), default_master_setting_option('godowns')),
    'order godown',
    true
  );

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

DROP FUNCTION IF EXISTS create_stock_adjustment_atomic(uuid, godown_enum, integer, stock_adjustment_type_enum, text, uuid);

CREATE OR REPLACE FUNCTION create_stock_adjustment_atomic(
  p_product_id uuid,
  p_location text,
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
  v_location text;
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

  v_location := validate_master_setting_option('godowns', p_location, 'location', true);

  SELECT stock_qty
  INTO v_current_qty
  FROM product_stock_locations
  WHERE product_id = p_product_id
    AND location = v_location
  FOR UPDATE;

  IF v_current_qty IS NULL THEN
    INSERT INTO product_stock_locations (product_id, location, stock_qty)
    VALUES (p_product_id, v_location, 0)
    ON CONFLICT (product_id, location) DO NOTHING;
    v_current_qty := 0;
  END IF;

  v_new_qty := CASE
    WHEN p_type = 'Addition' THEN v_current_qty + p_quantity
    ELSE v_current_qty - p_quantity
  END;

  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Stock cannot go below zero at %', v_location;
  END IF;

  INSERT INTO stock_adjustments (product_id, quantity, type, reason, location, adjusted_by)
  VALUES (p_product_id, p_quantity, p_type, p_reason, v_location, v_actor)
  RETURNING id INTO v_adjustment_id;

  UPDATE product_stock_locations
  SET stock_qty = v_new_qty,
      updated_at = NOW()
  WHERE product_id = p_product_id
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
    p_product_id,
    CASE WHEN p_type = 'Addition' THEN p_quantity ELSE -p_quantity END,
    'adjustment',
    'stock_adjustment',
    v_adjustment_id,
    v_location,
    v_actor
  );

  RETURN v_adjustment_id;
END;
$$;

DROP FUNCTION IF EXISTS transfer_stock(uuid, godown_enum, godown_enum, integer, text, uuid);

CREATE OR REPLACE FUNCTION transfer_stock(
  p_product_id uuid,
  p_from_location text,
  p_to_location text,
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
  v_from_location text;
  v_to_location text;
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

  v_from_location := validate_master_setting_option('godowns', p_from_location, 'from location', true);
  v_to_location := validate_master_setting_option('godowns', p_to_location, 'to location', true);

  IF v_from_location = v_to_location THEN
    RAISE EXCEPTION 'Cannot transfer to same location';
  END IF;

  SELECT stock_qty
  INTO v_from_stock
  FROM product_stock_locations
  WHERE product_id = p_product_id
    AND location = v_from_location
  FOR UPDATE;

  IF v_from_stock IS NULL OR v_from_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock at % (available: %)', v_from_location, COALESCE(v_from_stock, 0);
  END IF;

  INSERT INTO stock_transfers (product_id, from_location, to_location, quantity, reason, transferred_by)
  VALUES (p_product_id, v_from_location, v_to_location, p_quantity, p_reason, v_actor)
  RETURNING id INTO v_transfer_id;

  UPDATE product_stock_locations
  SET stock_qty = stock_qty - p_quantity,
      updated_at = NOW()
  WHERE product_id = p_product_id
    AND location = v_from_location;

  INSERT INTO product_stock_locations (product_id, location, stock_qty)
  VALUES (p_product_id, v_to_location, p_quantity)
  ON CONFLICT (product_id, location)
  DO UPDATE SET stock_qty = product_stock_locations.stock_qty + p_quantity,
                updated_at = NOW();

  INSERT INTO stock_movements (
    product_id,
    quantity,
    movement_type,
    reference_type,
    reference_id,
    location,
    created_by
  )
  VALUES
    (p_product_id, -p_quantity, 'transfer_out', 'stock_transfers', v_transfer_id, v_from_location, v_actor),
    (p_product_id, p_quantity, 'transfer_in', 'stock_transfers', v_transfer_id, v_to_location, v_actor);

  RETURN TRUE;
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
  v_location text;
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

  SELECT d.id, d.order_id, d.status AS current_status, o.status AS order_status, o.godown
  INTO v_delivery
  FROM deliveries d
  JOIN orders o ON o.id = d.order_id
  WHERE d.id = p_delivery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found: %', p_delivery_id;
  END IF;

  v_location := validate_master_setting_option(
    'godowns',
    COALESCE(NULLIF(BTRIM(v_delivery.godown), ''), default_master_setting_option('godowns')),
    'delivery godown',
    true
  );

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
  v_item_location text;
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
    v_item_location := validate_master_setting_option('godowns', v_item->>'location', 'GRN location', true);
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
      v_item_location,
      'Completed',
      CURRENT_DATE
    );

    INSERT INTO product_stock_locations (product_id, location, stock_qty)
    VALUES ((v_item->>'product_id')::uuid, v_item_location, v_net_qty)
    ON CONFLICT (product_id, location)
    DO UPDATE SET stock_qty = product_stock_locations.stock_qty + v_net_qty,
                  updated_at = NOW();

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
      (v_item->>'product_id')::uuid,
      v_net_qty,
      'grn_receipt',
      'grn',
      v_grn_id,
      v_item_location,
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

-- ---------------------------------------------------------------------------
-- Grants for replaced signatures.
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION create_order(company_enum, invoice_type_enum, uuid, text, text, jsonb, text, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_stock_adjustment_atomic(uuid, text, integer, stock_adjustment_type_enum, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_stock(uuid, text, text, integer, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_stock_at_location(uuid, text, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_customer(text, text, text, text, text, text, text, numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stock_by_location(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_low_stock_products(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- Finally, drop the now-unused enum types.
-- ---------------------------------------------------------------------------

DROP TYPE IF EXISTS district_enum;
DROP TYPE IF EXISTS vehicle_type_enum;
DROP TYPE IF EXISTS godown_enum;

-- ---------------------------------------------------------------------------
-- Recreate stock summary view using dynamic locations.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW product_stock_summary AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.sku,
  b.name AS brand_name,
  COALESCE(SUM(psl.stock_qty), 0) AS total_stock,
  COALESCE(
    jsonb_object_agg(psl.location, psl.stock_qty) FILTER (WHERE psl.location IS NOT NULL),
    '{}'::jsonb
  ) AS stock_by_location
FROM products p
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN product_stock_locations psl ON p.id = psl.product_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.sku, b.name;

COMMENT ON VIEW product_stock_summary IS 'Aggregated stock by product with per-location quantities in stock_by_location JSON.';

GRANT SELECT ON product_stock_summary TO authenticated;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verification queries (run manually after migration)
-- ---------------------------------------------------------------------------
-- SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace
--   AND typname IN ('district_enum', 'vehicle_type_enum', 'godown_enum');
--
-- SELECT key, value FROM settings
--   WHERE key IN ('godowns', 'districts', 'vehicle_types')
--   ORDER BY key;
--
-- SELECT proname, pg_get_function_arguments(p.oid)
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND proname IN (
--     'create_order',
--     'create_stock_adjustment_atomic',
--     'transfer_stock',
--     'create_grn',
--     'update_delivery_status'
--   )
-- ORDER BY proname;