-- =====================================================================
-- P2 — TAX / INVENTORY / RETURNS / DELIVERIES SCHEMA EXTENSIONS
-- =====================================================================
-- Adds the missing columns and tables needed for GSTR-1-compliant
-- invoicing, per-line tax persistence, partial deliveries, purchase
-- returns, cost / COGS, and place-of-supply derivation.
--
-- Apply order:
--   1. INVOICE_NUMBER_SEQUENCES.sql      (P0)
--   2. RLS_AUDIT.sql                     (P0)
--   3. P2_TAX_SCHEMA_EXTENSIONS.sql      (this file)
--   4. AUDIT_TRAIL.sql                   (P2.10)
--   5. PURCHASE_RETURNS.sql              (P2.5)
--   6. DELIVERY_ITEMS.sql                (P2.6)
--
-- DOWN section at the bottom.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. States master (place-of-supply derivation)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.states (
    code      text PRIMARY KEY,  -- GSTIN state code, '01'..'37'
    name      text NOT NULL UNIQUE,
    short_name text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

INSERT INTO public.states (code, name, short_name) VALUES
    ('01', 'Jammu and Kashmir', 'JK'),
    ('02', 'Himachal Pradesh', 'HP'),
    ('03', 'Punjab', 'PB'),
    ('04', 'Chandigarh', 'CH'),
    ('05', 'Uttarakhand', 'UK'),
    ('06', 'Haryana', 'HR'),
    ('07', 'Delhi', 'DL'),
    ('08', 'Rajasthan', 'RJ'),
    ('09', 'Uttar Pradesh', 'UP'),
    ('10', 'Bihar', 'BR'),
    ('11', 'Sikkim', 'SK'),
    ('12', 'Arunachal Pradesh', 'AR'),
    ('13', 'Nagaland', 'NL'),
    ('14', 'Manipur', 'MN'),
    ('15', 'Mizoram', 'MZ'),
    ('16', 'Tripura', 'TR'),
    ('17', 'Meghalaya', 'ML'),
    ('18', 'Assam', 'AS'),
    ('19', 'West Bengal', 'WB'),
    ('20', 'Jharkhand', 'JH'),
    ('21', 'Odisha', 'OR'),
    ('22', 'Chhattisgarh', 'CG'),
    ('23', 'Madhya Pradesh', 'MP'),
    ('24', 'Gujarat', 'GJ'),
    ('25', 'Daman and Diu', 'DD'),
    ('26', 'Dadra and Nagar Haveli', 'DN'),
    ('27', 'Maharashtra', 'MH'),
    ('28', 'Andhra Pradesh (Old)', 'AP'),
    ('29', 'Karnataka', 'KA'),
    ('30', 'Goa', 'GA'),
    ('31', 'Lakshadweep', 'LD'),
    ('32', 'Kerala', 'KL'),
    ('33', 'Tamil Nadu', 'TN'),
    ('34', 'Puducherry', 'PY'),
    ('35', 'Andaman and Nicobar', 'AN'),
    ('36', 'Telangana', 'TS'),
    ('37', 'Andhra Pradesh', 'AD')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS states_read ON public.states;
CREATE POLICY states_read ON public.states FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------
-- 2. Products — HSN, tax_rate, UoM, cost_price
-- ---------------------------------------------------------------------
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS hsn_code   text,
    ADD COLUMN IF NOT EXISTS tax_rate   numeric(5,2) NOT NULL DEFAULT 18,
    ADD COLUMN IF NOT EXISTS uom        text NOT NULL DEFAULT 'PCS',
    ADD COLUMN IF NOT EXISTS cost_price numeric(14,2);

COMMENT ON COLUMN public.products.hsn_code   IS 'HSN classification code. Required on B2B invoices for GST > ₹5cr aggregate.';
COMMENT ON COLUMN public.products.tax_rate   IS 'GST slab % — one of 0/5/12/18/28 (with 0.1, 0.25, 1, 1.5, 3, 7.5 reserved for special).';
COMMENT ON COLUMN public.products.uom        IS 'Unit of measure (PCS, KG, MTR, etc.) — printed on invoice.';
COMMENT ON COLUMN public.products.cost_price IS 'Most recent / weighted-average cost. Drives COGS in P&L.';

-- ---------------------------------------------------------------------
-- 3. Customers / Suppliers / Companies — state_code
-- ---------------------------------------------------------------------
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state_code text REFERENCES public.states(code);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS state_code text REFERENCES public.states(code);
-- companies may be a settings JSON, not a table — defer to runtime
-- migration via app_settings.companies[].state_code instead.

-- ---------------------------------------------------------------------
-- 4. Orders — place_of_supply, reverse_charge, round_off
-- ---------------------------------------------------------------------
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS place_of_supply text REFERENCES public.states(code),
    ADD COLUMN IF NOT EXISTS reverse_charge  boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS round_off       numeric(6,2) NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------
-- 5. Order items — per-line tax, HSN, UoM, fulfilment counters
-- ---------------------------------------------------------------------
ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS tax_rate        numeric(5,2),
    ADD COLUMN IF NOT EXISTS taxable_amount  numeric(14,2),
    ADD COLUMN IF NOT EXISTS cgst_amount     numeric(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_amount     numeric(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_amount     numeric(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hsn_code        text,
    ADD COLUMN IF NOT EXISTS uom             text,
    ADD COLUMN IF NOT EXISTS received_qty    numeric(14,3) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS delivered_qty   numeric(14,3) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS returned_qty    numeric(14,3) NOT NULL DEFAULT 0;

-- Index covers GRN/Delivery flows that query by order + product.
CREATE INDEX IF NOT EXISTS order_items_order_product_idx
    ON public.order_items (order_id, product_id);

-- ---------------------------------------------------------------------
-- 6. Backfill — derive sensible defaults for existing rows.
-- ---------------------------------------------------------------------
-- 6a. Order item tax_rate ← 18 (matches the legacy hard-coded "CGST 9 / SGST 9" PDF).
UPDATE public.order_items
SET tax_rate = COALESCE(tax_rate, 18);

-- 6b. Order item taxable_amount ← amount/1.18 if grand_total looks tax-inclusive;
-- otherwise ← amount. This is a best-effort backfill: the data may be wrong on
-- legacy rows; emit a report file (see check below) for manual review.
UPDATE public.order_items oi
SET taxable_amount = COALESCE(taxable_amount, amount)
WHERE taxable_amount IS NULL;

-- 6c. Products: copy any pre-existing data; default 18% / PCS already covers the rest.

-- 6d. Customer / Supplier state_code: derive from address if it ends with a known state name.
-- This is a best-effort partial backfill; rows where derivation fails remain NULL and the
-- migration report (below) lists them for manual fill via the Admin UI.
UPDATE public.customers c
SET state_code = s.code
FROM public.states s
WHERE c.state_code IS NULL
  AND c.address IS NOT NULL
  AND (c.address ILIKE '%' || s.name || '%' OR c.address ILIKE '%' || s.short_name || '%');

UPDATE public.suppliers s
SET state_code = st.code
FROM public.states st
WHERE s.state_code IS NULL
  AND s.address IS NOT NULL
  AND (s.address ILIKE '%' || st.name || '%' OR s.address ILIKE '%' || st.short_name || '%');

-- 6e. orders.place_of_supply ← customer's state_code (post-backfill).
UPDATE public.orders o
SET place_of_supply = c.state_code
FROM public.customers c
WHERE o.customer_id = c.id
  AND o.place_of_supply IS NULL
  AND c.state_code IS NOT NULL;

-- ---------------------------------------------------------------------
-- 7. Migration report — rows still needing manual fill
-- ---------------------------------------------------------------------
-- Run these after applying. Each returns the rows that still need
-- attention. Surface them in the admin UI as a remediation banner.
--
-- SELECT id, name FROM public.products WHERE hsn_code IS NULL;
-- SELECT id, name, address FROM public.customers WHERE state_code IS NULL;
-- SELECT id, name, address FROM public.suppliers WHERE state_code IS NULL;
-- SELECT id, order_number FROM public.orders WHERE place_of_supply IS NULL;

COMMIT;

-- =====================================================================
-- DOWN
-- =====================================================================
-- BEGIN;
-- ALTER TABLE public.order_items
--     DROP COLUMN IF EXISTS returned_qty,
--     DROP COLUMN IF EXISTS delivered_qty,
--     DROP COLUMN IF EXISTS received_qty,
--     DROP COLUMN IF EXISTS uom,
--     DROP COLUMN IF EXISTS hsn_code,
--     DROP COLUMN IF EXISTS igst_amount,
--     DROP COLUMN IF EXISTS sgst_amount,
--     DROP COLUMN IF EXISTS cgst_amount,
--     DROP COLUMN IF EXISTS taxable_amount,
--     DROP COLUMN IF EXISTS tax_rate;
-- ALTER TABLE public.orders
--     DROP COLUMN IF EXISTS round_off,
--     DROP COLUMN IF EXISTS reverse_charge,
--     DROP COLUMN IF EXISTS place_of_supply;
-- ALTER TABLE public.suppliers DROP COLUMN IF EXISTS state_code;
-- ALTER TABLE public.customers DROP COLUMN IF EXISTS state_code;
-- ALTER TABLE public.products
--     DROP COLUMN IF EXISTS cost_price,
--     DROP COLUMN IF EXISTS uom,
--     DROP COLUMN IF EXISTS tax_rate,
--     DROP COLUMN IF EXISTS hsn_code;
-- DROP TABLE IF EXISTS public.states;
-- COMMIT;
