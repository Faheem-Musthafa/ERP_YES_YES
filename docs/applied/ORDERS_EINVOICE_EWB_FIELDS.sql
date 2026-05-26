-- Orders: e-Invoice (IRN) and e-Way Bill fields
-- Date: 2026-05-26
-- Adds NIC IRP and e-Way Bill columns to orders so the invoice PDF renderer
-- can produce the three variants seen in the supplied sample PDFs.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS irn text,
  ADD COLUMN IF NOT EXISTS ack_no text,
  ADD COLUMN IF NOT EXISTS ack_date date,
  ADD COLUMN IF NOT EXISTS signed_qr_payload text,
  ADD COLUMN IF NOT EXISTS e_invoice_status text,
  ADD COLUMN IF NOT EXISTS e_invoice_generated_at timestamptz;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_e_invoice_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_e_invoice_status_check
  CHECK (e_invoice_status IS NULL OR e_invoice_status IN ('pending','generated','cancelled'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_irn_unique
  ON public.orders (irn) WHERE irn IS NOT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ewb_no text,
  ADD COLUMN IF NOT EXISTS ewb_generated_date timestamptz,
  ADD COLUMN IF NOT EXISTS ewb_valid_upto timestamptz,
  ADD COLUMN IF NOT EXISTS ewb_mode text,
  ADD COLUMN IF NOT EXISTS ewb_supply_type text,
  ADD COLUMN IF NOT EXISTS ewb_transaction_type text,
  ADD COLUMN IF NOT EXISTS ewb_approx_distance integer,
  ADD COLUMN IF NOT EXISTS transporter_name text,
  ADD COLUMN IF NOT EXISTS transporter_id text,
  ADD COLUMN IF NOT EXISTS vehicle_no text,
  ADD COLUMN IF NOT EXISTS dispatch_from_pincode text,
  ADD COLUMN IF NOT EXISTS ship_to_pincode text;

CREATE INDEX IF NOT EXISTS idx_orders_ewb_no
  ON public.orders (ewb_no) WHERE ewb_no IS NOT NULL;
