-- Add company support to stock transfers
-- Run in Supabase SQL Editor

ALTER TABLE public.stock_transfers
  ADD COLUMN IF NOT EXISTS company public.company_enum;

CREATE OR REPLACE FUNCTION public.transfer_stock(
  p_product_id uuid,
  p_from_location text,
  p_to_location text,
  p_quantity integer,
  p_company public.company_enum DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  v_from_location := validate_master_setting_option('Godowns', p_from_location, 'from location', true);
  v_to_location := validate_master_setting_option('Godowns', p_to_location, 'to location', true);

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

  INSERT INTO stock_transfers (company, product_id, from_location, to_location, quantity, reason, transferred_by)
  VALUES (p_company, p_product_id, v_from_location, v_to_location, p_quantity, p_reason, v_actor)
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

  INSERT INTO stock_movements (product_id, quantity, movement_type, reference_type, reference_id, location, created_by)
  VALUES
    (p_product_id, -p_quantity, 'transfer_out', 'stock_transfers', v_transfer_id, v_from_location, v_actor),
    (p_product_id, p_quantity, 'transfer_in', 'stock_transfers', v_transfer_id, v_to_location, v_actor);

  RETURN TRUE;
END;
$function$;
