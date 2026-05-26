-- Orders: salesperson attribution
-- Date: 2026-05-26
-- Adds salesperson_id to orders and updates create_order RPC to require + validate it.
-- Reason: staff under a salesperson sometimes enter orders on their behalf;
-- created_by is no longer a reliable answer to "who made the sale".

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS salesperson_id uuid
  REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_salesperson_id
  ON public.orders (salesperson_id)
  WHERE salesperson_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.create_order(company_enum, invoice_type_enum, uuid, text, text, jsonb, text, date, uuid);

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
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_total_discount numeric := 0;
  v_item_amount numeric;
  v_item_discount numeric;
  v_actor uuid := COALESCE(p_created_by, auth.uid());
  v_godown text;
  v_salesperson_ok boolean;
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
  )
  INTO v_salesperson_ok;

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
$function$;
