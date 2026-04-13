-- Hotfix: update billing reversal approval to use dynamic settings-backed godowns.
-- Run this in Supabase SQL editor if you get:
-- ERROR: type "godown_enum" does not exist

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
  v_location text;
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

  v_location := validate_master_setting_option(
    'godowns',
    COALESCE(NULLIF(BTRIM(v_order.godown), ''), default_master_setting_option('godowns')),
    'billing reversal location',
    true
  );

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

  UPDATE public.receipts
  SET payment_status = 'Voided',
      bounce_reason = CASE
        WHEN COALESCE(TRIM(p_admin_note), '') = '' THEN bounce_reason
        ELSE CONCAT('Voided during billing reversal: ', TRIM(p_admin_note))
      END
  WHERE order_id = v_order.id
    AND COALESCE(payment_status, '') <> 'Voided';

  UPDATE public.collections
  SET status = 'Voided',
      updated_at = NOW()
  WHERE order_id = v_order.id
    AND status <> 'Voided';

  INSERT INTO public.data_recovery_events (
    entity_table,
    entity_id,
    entity_label,
    action,
    actor_id,
    reason,
    metadata
  )
  VALUES
    (
      'orders',
      v_order.id,
      v_order.order_number,
      'reversed',
      v_actor,
      NULLIF(TRIM(p_admin_note), ''),
      jsonb_build_object('request_id', p_request_id, 'invoice_number', v_order.invoice_number)
    );

  UPDATE public.orders
  SET status = 'Pending',
      approved_by = NULL,
      approved_at = NULL,
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

REVOKE EXECUTE ON FUNCTION public.approve_billing_reversal(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_billing_reversal(UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_billing_reversal(UUID, UUID, TEXT) TO authenticated;
