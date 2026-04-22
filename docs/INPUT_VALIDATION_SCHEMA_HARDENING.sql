BEGIN;

-- Backend validation helpers for new writes. Constraints are added as NOT VALID so
-- existing legacy rows do not block deployment, while all future inserts/updates
-- must satisfy the checks immediately.

CREATE OR REPLACE FUNCTION public.is_valid_email(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_value ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$';
$$;

CREATE OR REPLACE FUNCTION public.is_valid_phone(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_value ~ '^\+?[0-9]{7,15}$';
$$;

CREATE OR REPLACE FUNCTION public.is_valid_pincode(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_value ~ '^[0-9]{6}$';
$$;

CREATE OR REPLACE FUNCTION public.is_valid_pan(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_value ~ '^[A-Z]{5}[0-9]{4}[A-Z]$';
$$;

CREATE OR REPLACE FUNCTION public.is_valid_gstin(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_value ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$';
$$;

CREATE OR REPLACE FUNCTION public.validate_settings_payload()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_key text := NEW.key;
  v_company text;
  v_profile jsonb;
BEGIN
  IF v_key = 'max_discount_percentage' THEN
    IF jsonb_typeof(NEW.value) <> 'number' OR (NEW.value #>> '{}')::numeric < 0 OR (NEW.value #>> '{}')::numeric > 100 THEN
      RAISE EXCEPTION 'max_discount_percentage must be a number between 0 and 100';
    END IF;
  ELSIF v_key = 'default_invoice_type' THEN
    IF jsonb_typeof(NEW.value) <> 'string' OR (NEW.value #>> '{}') NOT IN ('GST', 'NGST', 'IGST', 'Delivery Challan Out', 'Delivery Challan In', 'Stock Transfer', 'Credit Note') THEN
      RAISE EXCEPTION 'default_invoice_type is invalid';
    END IF;
  ELSIF v_key IN ('Godowns', 'districts', 'vehicle_types') THEN
    IF jsonb_typeof(NEW.value) <> 'array' THEN
      RAISE EXCEPTION '% must be a JSON array', v_key;
    END IF;
  ELSIF v_key = 'company_profiles' THEN
    IF jsonb_typeof(NEW.value) <> 'object' THEN
      RAISE EXCEPTION 'company_profiles must be a JSON object';
    END IF;

    FOREACH v_company IN ARRAY ARRAY['YES YES', 'LLP', 'Zekon']
    LOOP
      v_profile := NEW.value -> v_company;
      IF v_profile IS NULL OR jsonb_typeof(v_profile) <> 'object' THEN
        RAISE EXCEPTION 'company_profiles.% must be an object', v_company;
      END IF;

      IF NULLIF(BTRIM(v_profile ->> 'company_name'), '') IS NULL THEN
        RAISE EXCEPTION 'company_profiles.%.company_name is required', v_company;
      END IF;

      IF NULLIF(BTRIM(v_profile ->> 'company_address'), '') IS NULL THEN
        RAISE EXCEPTION 'company_profiles.%.company_address is required', v_company;
      END IF;

      IF COALESCE(v_profile ->> 'company_phone', '') <> '' AND NOT public.is_valid_phone(v_profile ->> 'company_phone') THEN
        RAISE EXCEPTION 'company_profiles.%.company_phone is invalid', v_company;
      END IF;

      IF COALESCE(v_profile ->> 'company_email', '') <> '' AND NOT public.is_valid_email(v_profile ->> 'company_email') THEN
        RAISE EXCEPTION 'company_profiles.%.company_email is invalid', v_company;
      END IF;

      IF COALESCE(v_profile ->> 'company_gstin', '') <> '' AND NOT public.is_valid_gstin(v_profile ->> 'company_gstin') THEN
        RAISE EXCEPTION 'company_profiles.%.company_gstin is invalid', v_company;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_settings_payload ON public.settings;
CREATE TRIGGER trg_validate_settings_payload
BEFORE INSERT OR UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.validate_settings_payload();

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_name_required_chk;
ALTER TABLE public.customers ADD CONSTRAINT customers_name_required_chk
CHECK (NULLIF(BTRIM(name), '') IS NOT NULL) NOT VALID;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_address_required_chk;
ALTER TABLE public.customers ADD CONSTRAINT customers_address_required_chk
CHECK (NULLIF(BTRIM(address), '') IS NOT NULL) NOT VALID;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_phone_format_chk;
ALTER TABLE public.customers ADD CONSTRAINT customers_phone_format_chk
CHECK (public.is_valid_phone(phone)) NOT VALID;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_second_phone_format_chk;
ALTER TABLE public.customers ADD CONSTRAINT customers_second_phone_format_chk
CHECK (second_phone IS NULL OR public.is_valid_phone(second_phone)) NOT VALID;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_pincode_format_chk;
ALTER TABLE public.customers ADD CONSTRAINT customers_pincode_format_chk
CHECK (pincode IS NULL OR public.is_valid_pincode(pincode)) NOT VALID;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_gst_pan_format_chk;
ALTER TABLE public.customers ADD CONSTRAINT customers_gst_pan_format_chk
CHECK (gst_pan IS NULL OR public.is_valid_gstin(gst_pan)) NOT VALID;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_pan_no_format_chk;
ALTER TABLE public.customers ADD CONSTRAINT customers_pan_no_format_chk
CHECK (pan_no IS NULL OR public.is_valid_pan(pan_no)) NOT VALID;

ALTER TABLE public.brands DROP CONSTRAINT IF EXISTS brands_name_required_chk;
ALTER TABLE public.brands ADD CONSTRAINT brands_name_required_chk
CHECK (NULLIF(BTRIM(name), '') IS NOT NULL AND char_length(name) <= 120) NOT VALID;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_name_required_chk;
ALTER TABLE public.products ADD CONSTRAINT products_name_required_chk
CHECK (NULLIF(BTRIM(name), '') IS NOT NULL AND char_length(name) <= 255) NOT VALID;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sku_format_chk;
ALTER TABLE public.products ADD CONSTRAINT products_sku_format_chk
CHECK (sku ~ '^[A-Za-z0-9][A-Za-z0-9/_-]{1,39}$') NOT VALID;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_dealer_price_nonnegative_chk;
ALTER TABLE public.products ADD CONSTRAINT products_dealer_price_nonnegative_chk
CHECK (dealer_price >= 0) NOT VALID;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_full_name_required_chk;
ALTER TABLE public.users ADD CONSTRAINT users_full_name_required_chk
CHECK (NULLIF(BTRIM(full_name), '') IS NOT NULL AND char_length(full_name) <= 120) NOT VALID;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_format_chk;
ALTER TABLE public.users ADD CONSTRAINT users_email_format_chk
CHECK (public.is_valid_email(email)) NOT VALID;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_employee_id_length_chk;
ALTER TABLE public.users ADD CONSTRAINT users_employee_id_length_chk
CHECK (employee_id IS NULL OR char_length(employee_id) <= 30) NOT VALID;

ALTER TABLE public.delivery_agents DROP CONSTRAINT IF EXISTS delivery_agents_name_required_chk;
ALTER TABLE public.delivery_agents ADD CONSTRAINT delivery_agents_name_required_chk
CHECK (NULLIF(BTRIM(name), '') IS NOT NULL AND char_length(name) <= 120) NOT VALID;

ALTER TABLE public.delivery_agents DROP CONSTRAINT IF EXISTS delivery_agents_phone_format_chk;
ALTER TABLE public.delivery_agents ADD CONSTRAINT delivery_agents_phone_format_chk
CHECK (phone IS NULL OR public.is_valid_phone(phone)) NOT VALID;

ALTER TABLE public.delivery_agents DROP CONSTRAINT IF EXISTS delivery_agents_vehicle_number_format_chk;
ALTER TABLE public.delivery_agents ADD CONSTRAINT delivery_agents_vehicle_number_format_chk
CHECK (vehicle_number IS NULL OR vehicle_number ~ '^[A-Z0-9-]{6,20}$') NOT VALID;

ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_amount_positive_chk;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_amount_positive_chk
CHECK (amount > 0) NOT VALID;

ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_brand_required_chk;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_brand_required_chk
CHECK (NULLIF(BTRIM(brand), '') IS NOT NULL AND char_length(brand) <= 120) NOT VALID;

ALTER TABLE public.stock_adjustments DROP CONSTRAINT IF EXISTS stock_adjustments_quantity_positive_chk;
ALTER TABLE public.stock_adjustments ADD CONSTRAINT stock_adjustments_quantity_positive_chk
CHECK (quantity > 0) NOT VALID;

ALTER TABLE public.stock_adjustments DROP CONSTRAINT IF EXISTS stock_adjustments_reason_required_chk;
ALTER TABLE public.stock_adjustments ADD CONSTRAINT stock_adjustments_reason_required_chk
CHECK (NULLIF(BTRIM(reason), '') IS NOT NULL AND char_length(reason) <= 300) NOT VALID;

ALTER TABLE public.stock_transfers DROP CONSTRAINT IF EXISTS stock_transfers_quantity_positive_chk;
ALTER TABLE public.stock_transfers ADD CONSTRAINT stock_transfers_quantity_positive_chk
CHECK (quantity > 0) NOT VALID;

ALTER TABLE public.stock_transfers DROP CONSTRAINT IF EXISTS stock_transfers_distinct_locations_chk;
ALTER TABLE public.stock_transfers ADD CONSTRAINT stock_transfers_distinct_locations_chk
CHECK (from_location <> to_location) NOT VALID;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_quantity_positive_chk;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_quantity_positive_chk
CHECK (quantity > 0) NOT VALID;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_dealer_price_nonnegative_chk;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_dealer_price_nonnegative_chk
CHECK (dealer_price >= 0) NOT VALID;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_discount_pct_range_chk;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_discount_pct_range_chk
CHECK (discount_pct >= 0 AND discount_pct <= 100) NOT VALID;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_amount_nonnegative_chk;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_amount_nonnegative_chk
CHECK (amount >= 0) NOT VALID;

COMMIT;


-- After cleaning legacy rows, validate constraints explicitly:
-- ALTER TABLE public.customers VALIDATE CONSTRAINT customers_phone_format_chk;
-- ALTER TABLE public.customers VALIDATE CONSTRAINT customers_gst_pan_format_chk;
-- ALTER TABLE public.customers VALIDATE CONSTRAINT customers_pan_no_format_chk;
-- ALTER TABLE public.products VALIDATE CONSTRAINT products_sku_format_chk;
-- ALTER TABLE public.users VALIDATE CONSTRAINT users_email_format_chk;
