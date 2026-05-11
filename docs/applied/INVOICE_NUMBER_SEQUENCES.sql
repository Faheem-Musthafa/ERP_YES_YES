-- =====================================================================
-- INVOICE / CREDIT-NOTE / ORDER NUMBER SEQUENCES
-- =====================================================================
-- Purpose: replace the client-side `MAX(seq)+1` allocator
-- (Billing.tsx:218-231 + generate_invoice_number in
-- INVOICE_NUMBER_FORMAT_MIGRATION.sql) and the JS `Date.now()` order/CN
-- number fallbacks (CreateOrder.tsx:310, CreditNote.tsx:314) with a
-- transaction-safe row-locking allocator backed by an `invoice_sequences`
-- table.
--
-- Two browser tabs hitting Bill on the same Approved order will now either
-- get the same number (idempotency) or two different numbers (no
-- duplicate). The race is removed by `SELECT … FOR UPDATE` on the
-- sequences row inside the billing RPC's transaction.
--
-- Apply order: after INVOICE_NUMBER_FORMAT_MIGRATION.sql and
-- RPC_IDEMPOTENCY_WRAPPERS.sql. Backfill existing series in the
-- bootstrap section near the bottom of the file.
--
-- DOWN section at the end.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  series_key text PRIMARY KEY,
  -- e.g. "CG182627"  (prefix + company-serial + FY code)
  last_seq integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.invoice_sequences IS
  'Server-side sequence allocator for invoice / credit-note / order numbers. One row per (prefix, company, FY) tuple. Locked via SELECT FOR UPDATE inside allocator function so concurrent transactions cannot mint duplicates.';

-- Only the allocator function may read/write directly; everything else
-- goes through the function. We harden via RLS even though the function
-- is SECURITY DEFINER and the table is server-internal.
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoice_sequences_no_anon ON public.invoice_sequences;
CREATE POLICY invoice_sequences_no_anon ON public.invoice_sequences
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
GRANT SELECT, INSERT, UPDATE ON public.invoice_sequences TO postgres;

-- ---------------------------------------------------------------------
-- Allocator
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.allocate_invoice_sequence(p_series_key text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_next integer;
BEGIN
  IF p_series_key IS NULL OR length(btrim(p_series_key)) = 0 THEN
    RAISE EXCEPTION 'series_key required';
  END IF;

  -- Insert-on-conflict guarantees the row exists before we lock it.
  INSERT INTO public.invoice_sequences (series_key, last_seq)
  VALUES (p_series_key, 0)
  ON CONFLICT (series_key) DO NOTHING;

  -- Row lock prevents concurrent transactions from reading + incrementing
  -- the same row. This is the core race-safety property.
  UPDATE public.invoice_sequences
  SET last_seq = last_seq + 1,
      updated_at = NOW()
  WHERE series_key = p_series_key
  RETURNING last_seq INTO v_next;

  RETURN v_next;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.allocate_invoice_sequence(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_invoice_sequence(text) TO postgres;

-- ---------------------------------------------------------------------
-- New generate_invoice_number using the allocator
-- ---------------------------------------------------------------------
-- Replaces the body of the existing function defined in
-- INVOICE_NUMBER_FORMAT_MIGRATION.sql. The signature and prefix mapping
-- are unchanged; only the seq-derivation switches from MAX(...)+1 to
-- allocate_invoice_sequence(...).

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

  -- Race-safe allocation. Reset behavior on FY change is automatic:
  -- the FY component is part of the series_key, so a new key is created
  -- with last_seq=0 at the start of each financial year.
  v_next_seq := public.allocate_invoice_sequence(v_base);

  RETURN v_base || lpad(v_next_seq::text, 4, '0');
END;
$function$;

-- ---------------------------------------------------------------------
-- Server-side order_number allocator
-- ---------------------------------------------------------------------
-- Used by `create_order` RPC and (post-cutover) by the frontend's
-- CreateOrder.tsx in place of the Date.now()-based ORD-XXXX fallback.

CREATE OR REPLACE FUNCTION public.allocate_order_number(
  p_company company_enum
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_fy text;
  v_company_serial text;
  v_now date := current_date;
  v_next integer;
BEGIN
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

  v_next := public.allocate_invoice_sequence('ORD' || v_company_serial || v_fy);
  RETURN 'ORD' || v_company_serial || v_fy || lpad(v_next::text, 4, '0');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.allocate_order_number(company_enum) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_order_number(company_enum) TO authenticated;

-- ---------------------------------------------------------------------
-- Idempotent Credit-Note billing RPC
-- ---------------------------------------------------------------------
-- The current Credit Note flow (Billing.tsx:1005-1041) bypasses
-- bill_order_idempotent and does a raw UPDATE on orders. That update is
-- not race-safe — two concurrent calls can both succeed and mint the
-- same invoice number. This RPC wraps the same logic with the
-- idempotency table from RPC_IDEMPOTENCY_WRAPPERS.sql.
--
-- Stock-in for "Sales Return" credit notes is handled in P2.4, not here.
-- This P0 RPC only deduplicates the *number-allocation* race.

CREATE OR REPLACE FUNCTION public.bill_credit_note_atomic(
  p_order_id uuid,
  p_billed_by uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_order record;
  v_actor uuid := COALESCE(p_billed_by, auth.uid());
  v_invoice_number text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'billed_by must match authenticated user';
  END IF;
  IF NOT public.is_role('accounts','admin') THEN
    RAISE EXCEPTION 'Insufficient role to bill credit note';
  END IF;

  SELECT id, order_number, company, invoice_type, godown, remarks, status, invoice_number
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_order.invoice_type <> 'Credit Note' THEN
    RAISE EXCEPTION 'Order % is not a Credit Note', p_order_id;
  END IF;

  IF v_order.status IN ('Billed', 'Delivered') THEN
    RETURN v_order.invoice_number;
  END IF;

  IF v_order.status NOT IN ('Pending', 'Approved') THEN
    RAISE EXCEPTION 'Credit note must be Pending or Approved to bill. Current: %', v_order.status;
  END IF;

  v_invoice_number := COALESCE(
    v_order.invoice_number,
    public.generate_invoice_number(v_order.company, v_order.invoice_type, v_order.godown, v_order.remarks)
  );

  UPDATE public.orders
  SET status = 'Billed',
      invoice_number = v_invoice_number,
      billed_by = v_actor,
      billed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN v_invoice_number;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.bill_credit_note_atomic(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bill_credit_note_atomic(uuid, uuid) TO authenticated;

-- Idempotent wrapper. Mirrors bill_order_idempotent. Reuses the same
-- rpc_idempotency_keys table from RPC_IDEMPOTENCY_WRAPPERS.sql.
CREATE OR REPLACE FUNCTION public.bill_credit_note_idempotent(
  p_order_id uuid,
  p_idempotency_key text,
  p_billed_by uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_existing text;
  v_invoice text;
BEGIN
  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'idempotency_key required';
  END IF;

  SELECT result_text INTO v_existing
  FROM public.rpc_idempotency_keys
  WHERE key = p_idempotency_key
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  v_invoice := public.bill_credit_note_atomic(p_order_id, p_billed_by);

  INSERT INTO public.rpc_idempotency_keys (key, result_text, created_at)
  VALUES (p_idempotency_key, v_invoice, NOW())
  ON CONFLICT (key) DO NOTHING;

  RETURN v_invoice;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.bill_credit_note_idempotent(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bill_credit_note_idempotent(uuid, text, uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- Bootstrap — seed invoice_sequences from existing orders so the new
-- allocator continues from the highest in-use number rather than 0001.
-- ---------------------------------------------------------------------
-- Run once at deploy time. Idempotent because of `ON CONFLICT … DO UPDATE`.
INSERT INTO public.invoice_sequences (series_key, last_seq)
SELECT series_key, MAX(seq) AS last_seq
FROM (
  SELECT
    -- Re-derive the series_key as `prefix + last 8 chars before the 4-digit suffix`.
    -- invoice_number layout = PREFIX(2-3 chars) + COMPANY(2 chars) + FY(4 chars) + SEQ(4 chars).
    -- We extract the leading non-digit prefix, the company+FY block, and the trailing seq.
    SUBSTRING(invoice_number FROM '^([A-Z]+)') || SUBSTRING(invoice_number FROM '([0-9]{6})[0-9]{4}$') AS series_key,
    RIGHT(invoice_number, 4)::int AS seq
  FROM public.orders
  WHERE invoice_number ~ '^[A-Z]+[0-9]{10}$'
) parsed
GROUP BY series_key
ON CONFLICT (series_key)
DO UPDATE SET last_seq = GREATEST(invoice_sequences.last_seq, EXCLUDED.last_seq),
              updated_at = NOW();

-- Likewise seed order numbers if any existing ORD-XXXX rows fit the new pattern.
-- Old Date.now-based fallback numbers won't match and are ignored.
INSERT INTO public.invoice_sequences (series_key, last_seq)
SELECT series_key, MAX(seq) AS last_seq
FROM (
  SELECT
    SUBSTRING(order_number FROM '^(ORD)') || SUBSTRING(order_number FROM 'ORD([0-9]{6})[0-9]{4}$') AS series_key,
    RIGHT(order_number, 4)::int AS seq
  FROM public.orders
  WHERE order_number ~ '^ORD[0-9]{10}$'
) parsed
WHERE series_key IS NOT NULL
GROUP BY series_key
ON CONFLICT (series_key)
DO UPDATE SET last_seq = GREATEST(invoice_sequences.last_seq, EXCLUDED.last_seq),
              updated_at = NOW();

COMMIT;

-- =====================================================================
-- DOWN
-- =====================================================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.bill_credit_note_idempotent(uuid, text, uuid);
-- DROP FUNCTION IF EXISTS public.bill_credit_note_atomic(uuid, uuid);
-- DROP FUNCTION IF EXISTS public.allocate_order_number(company_enum);
-- DROP FUNCTION IF EXISTS public.allocate_invoice_sequence(text);
-- -- generate_invoice_number revert is in INVOICE_NUMBER_FORMAT_MIGRATION.sql.
-- DROP TABLE IF EXISTS public.invoice_sequences;
-- COMMIT;
