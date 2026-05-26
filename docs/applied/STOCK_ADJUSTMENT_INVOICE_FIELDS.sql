-- Stock Adjustment: add invoice reference fields and update RPC
-- Date: 2026-05-26
-- Adds invoice_no and invoice_date to stock_adjustments and updates
-- create_stock_adjustment_atomic to accept and persist these fields.
-- Both fields are required for new adjustments; existing rows backfill as NULL.

ALTER TABLE public.stock_adjustments
  ADD COLUMN IF NOT EXISTS invoice_no text,
  ADD COLUMN IF NOT EXISTS invoice_date date;

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_invoice_no
  ON public.stock_adjustments (invoice_no)
  WHERE invoice_no IS NOT NULL;

-- Drop the previous signature so the new one with extra params replaces cleanly
DROP FUNCTION IF EXISTS public.create_stock_adjustment_atomic(uuid, text, integer, stock_adjustment_type_enum, text, uuid);

CREATE OR REPLACE FUNCTION public.create_stock_adjustment_atomic(
  p_product_id uuid,
  p_location text,
  p_quantity integer,
  p_type stock_adjustment_type_enum,
  p_reason text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_invoice_no text DEFAULT NULL,
  p_invoice_date date DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_adjustment_id uuid;
  v_current_qty integer;
  v_new_qty integer;
  v_actor uuid := COALESCE(p_user_id, auth.uid());
  v_location text;
  v_invoice_no text := NULLIF(BTRIM(COALESCE(p_invoice_no, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'user_id must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['inventory','admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to adjust stock';
  END IF;

  IF v_invoice_no IS NULL THEN
    RAISE EXCEPTION 'invoice_no is required';
  END IF;
  IF p_invoice_date IS NULL THEN
    RAISE EXCEPTION 'invoice_date is required';
  END IF;

  v_location := validate_master_setting_option('Godowns', p_location, 'location', true);

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

  INSERT INTO stock_adjustments
    (product_id, quantity, type, reason, location, adjusted_by, invoice_no, invoice_date)
  VALUES
    (p_product_id, p_quantity, p_type, p_reason, v_location, v_actor, v_invoice_no, p_invoice_date)
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
$function$;
