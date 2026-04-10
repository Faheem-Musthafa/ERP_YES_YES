-- ============================================================================
-- BILLING REVERSAL WORKFLOW
-- ============================================================================
-- Purpose:
-- 1) Introduce request/approval workflow for reversing billed orders
-- 2) Require admin approval for reversal execution
-- 3) Restore stock and move order from Billed -> Approved atomically
--
-- Prerequisite:
-- - docs/SECURITY_TRANSACTION_HARDENING.sql (for has_role/current_user_role)
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.billing_reversal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_number TEXT,
  company company_enum NOT NULL,
  request_reason TEXT NOT NULL,
  admin_review_note TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  requested_by UUID NOT NULL REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  rejected_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_reversal_requests_order_id
  ON public.billing_reversal_requests(order_id);

CREATE INDEX IF NOT EXISTS idx_billing_reversal_requests_status
  ON public.billing_reversal_requests(status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_reversal_pending_order
  ON public.billing_reversal_requests(order_id)
  WHERE status = 'Pending';

ALTER TABLE public.billing_reversal_requests ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'billing_reversal_requests'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.billing_reversal_requests', pol.policyname);
  END LOOP;
END
$$;

CREATE POLICY billing_reversal_requests_select_accounts_admin
ON public.billing_reversal_requests FOR SELECT TO authenticated
USING (has_role(ARRAY['accounts', 'admin']::user_role[]));

CREATE POLICY billing_reversal_requests_insert_accounts_admin
ON public.billing_reversal_requests FOR INSERT TO authenticated
WITH CHECK (
  has_role(ARRAY['accounts', 'admin']::user_role[])
  AND requested_by = auth.uid()
  AND status = 'Pending'
  AND approved_by IS NULL
  AND rejected_by IS NULL
  AND approved_at IS NULL
  AND rejected_at IS NULL
);

CREATE POLICY billing_reversal_requests_update_admin_only
ON public.billing_reversal_requests FOR UPDATE TO authenticated
USING (has_role(ARRAY['admin']::user_role[]))
WITH CHECK (has_role(ARRAY['admin']::user_role[]));

CREATE OR REPLACE FUNCTION public.request_billing_reversal(
  p_order_id UUID,
  p_reason TEXT,
  p_requested_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := COALESCE(p_requested_by, auth.uid());
  v_order RECORD;
  v_request_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'requested_by must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['accounts', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Only accounts/admin can request billing reversal';
  END IF;
  IF COALESCE(TRIM(p_reason), '') = '' THEN
    RAISE EXCEPTION 'Reversal reason is required';
  END IF;

  SELECT o.id, o.status, o.invoice_number, o.company
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF v_order.status <> 'Billed' THEN
    RAISE EXCEPTION 'Only billed orders can be reversed';
  END IF;

  SELECT r.id INTO v_request_id
  FROM public.billing_reversal_requests r
  WHERE r.order_id = p_order_id
    AND r.status = 'Pending'
  LIMIT 1;

  IF v_request_id IS NOT NULL THEN
    RETURN v_request_id;
  END IF;

  INSERT INTO public.billing_reversal_requests (
    order_id,
    invoice_number,
    company,
    request_reason,
    status,
    requested_by
  )
  VALUES (
    p_order_id,
    v_order.invoice_number,
    v_order.company,
    TRIM(p_reason),
    'Pending',
    v_actor
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_billing_reversal(
  p_request_id UUID,
  p_admin_user_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := COALESCE(p_admin_user_id, auth.uid());
  v_request RECORD;
  v_order RECORD;
  v_item RECORD;
  v_location godown_enum;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'admin_user_id must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['admin']::user_role[]) THEN
    RAISE EXCEPTION 'Only admin can approve billing reversal';
  END IF;

  SELECT *
  INTO v_request
  FROM public.billing_reversal_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reversal request not found';
  END IF;

  IF v_request.status <> 'Pending' THEN
    RETURN FALSE;
  END IF;

  SELECT o.id, o.status, o.godown, o.billed_by, o.invoice_number
  INTO v_order
  FROM public.orders o
  WHERE o.id = v_request.order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found for reversal';
  END IF;
  IF v_order.status <> 'Billed' THEN
    RAISE EXCEPTION 'Order must be in Billed status to reverse';
  END IF;

  v_location := COALESCE(v_order.godown, 'Kottakkal');

  FOR v_item IN
    SELECT oi.product_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = v_order.id
  LOOP
    INSERT INTO public.product_stock_locations (product_id, location, stock_qty)
    VALUES (v_item.product_id, v_location, 0)
    ON CONFLICT (product_id, location) DO NOTHING;

    UPDATE public.product_stock_locations
    SET stock_qty = stock_qty + v_item.quantity,
        updated_at = NOW()
    WHERE product_id = v_item.product_id
      AND location = v_location;

    INSERT INTO public.stock_movements (
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
      v_item.quantity,
      'order_unbilled',
      'billing_reversal',
      p_request_id,
      v_location,
      v_actor
    );
  END LOOP;

  UPDATE public.orders
  SET status = 'Approved',
      invoice_number = NULL,
      billed_by = NULL,
      billed_at = NULL,
      invoice_pdf_generated_at = NULL,
      remarks = CASE
        WHEN COALESCE(TRIM(p_admin_note), '') = '' THEN COALESCE(remarks, '')
        ELSE CONCAT(COALESCE(NULLIF(remarks, ''), ''), CASE WHEN COALESCE(NULLIF(remarks, ''), '') = '' THEN '' ELSE ' | ' END, 'Reversal approved: ', TRIM(p_admin_note))
      END,
      updated_at = NOW()
  WHERE id = v_order.id;

  UPDATE public.billing_reversal_requests
  SET status = 'Approved',
      admin_review_note = NULLIF(TRIM(p_admin_note), ''),
      approved_by = v_actor,
      approved_at = NOW(),
      rejected_by = NULL,
      rejected_at = NULL,
      updated_at = NOW()
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_billing_reversal(
  p_request_id UUID,
  p_admin_user_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := COALESCE(p_admin_user_id, auth.uid());
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'admin_user_id must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['admin']::user_role[]) THEN
    RAISE EXCEPTION 'Only admin can reject billing reversal';
  END IF;

  UPDATE public.billing_reversal_requests
  SET status = 'Rejected',
      admin_review_note = NULLIF(TRIM(p_admin_note), ''),
      rejected_by = v_actor,
      rejected_at = NOW(),
      approved_by = NULL,
      approved_at = NULL,
      updated_at = NOW()
  WHERE id = p_request_id
    AND status = 'Pending';

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_billing_reversal_requests(
  p_status TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT has_role(ARRAY['accounts', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Only accounts/admin can view reversal requests';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'order_id', r.order_id,
        'order_number', o.order_number,
        'invoice_number', r.invoice_number,
        'company', r.company,
        'status', r.status,
        'request_reason', r.request_reason,
        'admin_review_note', r.admin_review_note,
        'requested_by', r.requested_by,
        'requested_by_name', req.full_name,
        'approved_by_name', appr.full_name,
        'rejected_by_name', rej.full_name,
        'customer_name', c.name,
        'created_at', r.created_at,
        'updated_at', r.updated_at
      )
      ORDER BY r.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_rows
  FROM public.billing_reversal_requests r
  JOIN public.orders o ON o.id = r.order_id
  LEFT JOIN public.customers c ON c.id = o.customer_id
  LEFT JOIN public.users req ON req.id = r.requested_by
  LEFT JOIN public.users appr ON appr.id = r.approved_by
  LEFT JOIN public.users rej ON rej.id = r.rejected_by
  WHERE p_status IS NULL OR r.status = p_status;

  RETURN v_rows;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_billing_reversal(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.request_billing_reversal(UUID, TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.request_billing_reversal(UUID, TEXT, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.approve_billing_reversal(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_billing_reversal(UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_billing_reversal(UUID, UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reject_billing_reversal(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_billing_reversal(UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.reject_billing_reversal(UUID, UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_billing_reversal_requests(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_billing_reversal_requests(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_billing_reversal_requests(TEXT) TO authenticated;

COMMIT;
