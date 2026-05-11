-- =====================================================================
-- P2.5 — PURCHASE RETURNS / DEBIT NOTES TO SUPPLIERS
-- =====================================================================
-- Mirror of the Credit Note flow but for goods returned to vendors.
-- Decrements stock at the chosen godown and writes a debit-note number
-- via the same sequence allocator (INVOICE_NUMBER_SEQUENCES.sql).
--
-- Apply after INVOICE_NUMBER_SEQUENCES.sql + P2_TAX_SCHEMA_EXTENSIONS.sql.
-- DOWN at bottom.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.purchase_returns (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number text UNIQUE NOT NULL,  -- e.g. DBN<company><FY><seq>
    supplier_id   uuid NOT NULL REFERENCES public.suppliers(id),
    grn_id        uuid REFERENCES public.grn(id),
    return_date   date NOT NULL DEFAULT CURRENT_DATE,
    location      text NOT NULL,         -- godown returned from
    reason        text,
    status        text NOT NULL DEFAULT 'Posted' CHECK (status IN ('Posted', 'Voided')),
    created_by    uuid,
    created_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_return_items (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_return_id uuid NOT NULL REFERENCES public.purchase_returns(id) ON DELETE CASCADE,
    product_id         uuid NOT NULL REFERENCES public.products(id),
    grn_item_id        uuid REFERENCES public.grn_items(id),
    qty                numeric(14,3) NOT NULL CHECK (qty > 0),
    rate               numeric(14,2),
    amount             numeric(14,2)
);

CREATE INDEX IF NOT EXISTS pr_supplier_idx ON public.purchase_returns (supplier_id, return_date DESC);
CREATE INDEX IF NOT EXISTS pr_grn_idx ON public.purchase_returns (grn_id);
CREATE INDEX IF NOT EXISTS pri_pr_idx ON public.purchase_return_items (purchase_return_id);
CREATE INDEX IF NOT EXISTS pri_product_idx ON public.purchase_return_items (product_id);

ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pr_all ON public.purchase_returns;
DROP POLICY IF EXISTS pri_all ON public.purchase_return_items;
CREATE POLICY pr_all ON public.purchase_returns
    FOR ALL TO authenticated
    USING (public.is_role('admin','procurement','inventory'))
    WITH CHECK (public.is_role('admin','procurement','inventory'));
CREATE POLICY pri_all ON public.purchase_return_items
    FOR ALL TO authenticated
    USING (public.is_role('admin','procurement','inventory'))
    WITH CHECK (public.is_role('admin','procurement','inventory'));

-- ---------------------------------------------------------------------
-- Allocator wrapper for debit-note numbers (reuses invoice_sequences).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.allocate_purchase_return_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_fy text;
    v_now date := current_date;
    v_next integer;
BEGIN
    IF EXTRACT(MONTH FROM v_now) >= 4 THEN
        v_fy := to_char(v_now, 'YY') || to_char((v_now + interval '1 year')::date, 'YY');
    ELSE
        v_fy := to_char((v_now - interval '1 year')::date, 'YY') || to_char(v_now, 'YY');
    END IF;
    v_next := public.allocate_invoice_sequence('DBN' || v_fy);
    RETURN 'DBN' || v_fy || lpad(v_next::text, 4, '0');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.allocate_purchase_return_number() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.allocate_purchase_return_number() TO authenticated;

-- ---------------------------------------------------------------------
-- Idempotent create RPC. Cumulative cap: Σ returned ≤ Σ received per GRN.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_purchase_return_idempotent(
    p_supplier_id uuid,
    p_grn_id uuid,
    p_location text,
    p_items jsonb,            -- [{product_id, grn_item_id?, qty, rate, amount}]
    p_reason text,
    p_idempotency_key text,
    p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_existing uuid;
    v_pr_id    uuid;
    v_number   text;
    v_item     jsonb;
    v_received numeric;
    v_returned numeric;
    v_actor    uuid := COALESCE(p_created_by, auth.uid());
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT public.is_role('admin','procurement','inventory') THEN
        RAISE EXCEPTION 'Insufficient role to create purchase return';
    END IF;
    IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) = 0 THEN
        RAISE EXCEPTION 'idempotency_key required';
    END IF;

    SELECT (result_text::uuid) INTO v_existing
    FROM public.rpc_idempotency_keys WHERE key = p_idempotency_key;
    IF v_existing IS NOT NULL THEN
        RETURN v_existing;
    END IF;

    v_number := public.allocate_purchase_return_number();

    INSERT INTO public.purchase_returns
        (return_number, supplier_id, grn_id, location, reason, created_by)
    VALUES (v_number, p_supplier_id, p_grn_id, p_location, p_reason, v_actor)
    RETURNING id INTO v_pr_id;

    FOR v_item IN SELECT jsonb_array_elements(p_items)
    LOOP
        -- Cap check against the source GRN line, if linked.
        IF (v_item->>'grn_item_id') IS NOT NULL THEN
            SELECT received_qty INTO v_received
            FROM public.grn_items
            WHERE id = (v_item->>'grn_item_id')::uuid;
            SELECT COALESCE(SUM(qty), 0) INTO v_returned
            FROM public.purchase_return_items
            WHERE grn_item_id = (v_item->>'grn_item_id')::uuid;
            IF (v_returned + (v_item->>'qty')::numeric) > COALESCE(v_received, 0) THEN
                RAISE EXCEPTION 'Returned qty exceeds received qty for grn_item %',
                    (v_item->>'grn_item_id');
            END IF;
        END IF;

        INSERT INTO public.purchase_return_items
            (purchase_return_id, product_id, grn_item_id, qty, rate, amount)
        VALUES (
            v_pr_id,
            (v_item->>'product_id')::uuid,
            NULLIF((v_item->>'grn_item_id'), '')::uuid,
            (v_item->>'qty')::numeric,
            NULLIF((v_item->>'rate'), '')::numeric,
            NULLIF((v_item->>'amount'), '')::numeric
        );

        -- Stock-out at the chosen location.
        UPDATE public.product_stock_locations
        SET stock_qty = stock_qty - (v_item->>'qty')::numeric,
            updated_at = NOW()
        WHERE product_id = (v_item->>'product_id')::uuid
          AND location = p_location;

        INSERT INTO public.stock_movements
            (product_id, quantity, movement_type, reference_type, reference_id, location, created_by)
        VALUES (
            (v_item->>'product_id')::uuid,
            -((v_item->>'qty')::numeric),
            'purchase_return',
            'purchase_returns',
            v_pr_id,
            p_location,
            v_actor
        );
    END LOOP;

    INSERT INTO public.rpc_idempotency_keys (key, result_text, created_at)
    VALUES (p_idempotency_key, v_pr_id::text, NOW())
    ON CONFLICT (key) DO NOTHING;

    RETURN v_pr_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_purchase_return_idempotent(uuid, uuid, text, jsonb, text, text, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.create_purchase_return_idempotent(uuid, uuid, text, jsonb, text, text, uuid) TO authenticated;

COMMIT;

-- =====================================================================
-- DOWN
-- =====================================================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.create_purchase_return_idempotent(uuid, uuid, text, jsonb, text, text, uuid);
-- DROP FUNCTION IF EXISTS public.allocate_purchase_return_number();
-- DROP TABLE IF EXISTS public.purchase_return_items;
-- DROP TABLE IF EXISTS public.purchase_returns;
-- COMMIT;
