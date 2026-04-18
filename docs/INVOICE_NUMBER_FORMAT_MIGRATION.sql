-- Invoice number format migration
-- Implements company/invoice-type/godown based invoice prefixes and
-- supports Not-GST credit note code paths.
--
-- LLP FY 2026-27 series map (first sequence = 0001):
-- CN + 18 + 2627 + 0001 => CN1826270001
-- KN + 18 + 2627 + 0001 => KN1826270001
-- KG + 18 + 2627 + 0001 => KG1826270001
-- CG + 18 + 2627 + 0001 => CG1826270001
-- IG + 18 + 2627 + 0001 => IG1826270001
-- CDO + 18 + 2627 + 0001 => CDO1826270001
-- KDO + 18 + 2627 + 0001 => KDO1826270001
-- KDI + 18 + 2627 + 0001 => KDI1826270001
-- CDI + 18 + 2627 + 0001 => CDI1826270001
-- CGC + 18 + 2627 + 0001 => CGC1826270001
-- KGC + 18 + 2627 + 0001 => KGC1826270001
-- KNC + 18 + 2627 + 0001 => KNC1826270001
-- CNC + 18 + 2627 + 0001 => CNC1826270001
-- CM + 18 + 2627 + 0001 => CM1826270001 (Stock Transfer CALI -> CHEN)
-- KM + 18 + 2627 + 0001 => KM1826270001 (Stock Transfer CHEN -> CALI)

-- Compatibility: normalize master setting keys so both Godowns and godowns work.
CREATE OR REPLACE FUNCTION public.assert_master_setting_key(p_key text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_input text := lower(coalesce(btrim(p_key), ''));
  v_has_pascal boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.settings WHERE key = 'Godowns') INTO v_has_pascal;

  IF v_input = 'godowns' THEN
    IF v_has_pascal THEN
      RETURN 'Godowns';
    END IF;
    RETURN 'godowns';
  ELSIF v_input = 'districts' THEN
    RETURN 'districts';
  ELSIF v_input = 'vehicle_types' THEN
    RETURN 'vehicle_types';
  END IF;

  RAISE EXCEPTION 'Unsupported master setting key: %', p_key;
END;
$function$;

-- 1) Rich invoice generator with context
CREATE OR REPLACE FUNCTION public.generate_invoice_number(
  p_company company_enum,
  p_invoice_type invoice_type_enum,
  p_godown text DEFAULT NULL,
  p_remarks text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_serial text;
  v_fy text;
  v_location text := lower(coalesce(p_godown, ''));
  v_prefix text;
  v_credit_nature text := 'GST';
  v_base text;
  v_next_seq integer;
  v_now date := current_date;
BEGIN
  -- Financial year code like 2627 for FY 2026-27
  IF EXTRACT(MONTH FROM v_now) >= 4 THEN
    v_fy := to_char(v_now, 'YY') || to_char((v_now + interval '1 year')::date, 'YY');
  ELSE
    v_fy := to_char((v_now - interval '1 year')::date, 'YY') || to_char(v_now, 'YY');
  END IF;

  v_company_serial := CASE p_company
    WHEN 'LLP' THEN '18'
    WHEN 'YES YES' THEN '96'
    WHEN 'Zekon' THEN '19'
    ELSE '00'
  END;

  IF p_invoice_type = 'Credit Note' THEN
    IF lower(coalesce(p_remarks, '')) LIKE '%not-gst%'
      OR lower(coalesce(p_remarks, '')) LIKE '%type: ngst%'
      OR lower(coalesce(p_remarks, '')) LIKE '%type:ngst%'
    THEN
      v_credit_nature := 'NGST';
    ELSE
      v_credit_nature := 'GST';
    END IF;
  END IF;

  IF p_company = 'LLP' THEN
    v_prefix := CASE p_invoice_type
      WHEN 'GST' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KG' ELSE 'CG' END
      WHEN 'NGST' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KN' ELSE 'CN' END
      WHEN 'IGST' THEN 'IG'
      WHEN 'Delivery Challan Out' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KDO' ELSE 'CDO' END
      WHEN 'Delivery Challan In' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KDI' ELSE 'CDI' END
      WHEN 'Stock Transfer' THEN CASE
        WHEN v_location LIKE '%chen-cali%'
          OR v_location LIKE '%chen to cali%'
          OR v_location LIKE '%chenakkal%calicut%'
        THEN 'KM'
        ELSE 'CM'
      END
      WHEN 'Credit Note' THEN CASE
        WHEN v_credit_nature = 'GST' AND v_location LIKE '%chenakkal%' THEN 'KGC'
        WHEN v_credit_nature = 'GST' THEN 'CGC'
        WHEN v_location LIKE '%chenakkal%' THEN 'KNC'
        ELSE 'CNC'
      END
      ELSE 'LLP'
    END;
  ELSIF p_company = 'YES YES' THEN
    v_prefix := CASE p_invoice_type
      WHEN 'GST' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KGY' ELSE 'CGY' END
      WHEN 'NGST' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KNY' ELSE 'CNY' END
      WHEN 'IGST' THEN 'IGY'
      WHEN 'Delivery Challan Out' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KDO' ELSE 'CDO' END
      WHEN 'Delivery Challan In' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KDI' ELSE 'CDI' END
      WHEN 'Credit Note' THEN CASE WHEN v_credit_nature = 'GST' THEN 'GYC' ELSE 'YNC' END
      ELSE 'YESYES'
    END;
  ELSIF p_company = 'Zekon' THEN
    v_prefix := CASE p_invoice_type
      WHEN 'GST' THEN 'GZ'
      WHEN 'NGST' THEN 'NZ'
      WHEN 'IGST' THEN 'IZ'
      WHEN 'Delivery Challan Out' THEN 'ZDO'
      WHEN 'Delivery Challan In' THEN 'ZDI'
      WHEN 'Credit Note' THEN CASE WHEN v_credit_nature = 'GST' THEN 'GZC' ELSE 'NZC' END
      ELSE 'ZK'
    END;
  ELSE
    v_prefix := 'INV';
  END IF;

  v_base := v_prefix || v_company_serial || v_fy;

  SELECT coalesce(max(right(invoice_number, 4)::int), 0) + 1
  INTO v_next_seq
  FROM orders
  WHERE invoice_number ~ ('^' || v_base || '[0-9]{4}$');

  RETURN v_base || lpad(v_next_seq::text, 4, '0');
END;
$function$;

-- 2) Backward compatible wrapper (legacy callers)
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_company company_enum)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.generate_invoice_number(p_company, 'GST'::invoice_type_enum, NULL, NULL);
END;
$function$;

-- 3) Billing function updated to pass invoice context
CREATE OR REPLACE FUNCTION public.bill_order_atomic(p_order_id uuid, p_billed_by uuid DEFAULT NULL::uuid)
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
$function$;
