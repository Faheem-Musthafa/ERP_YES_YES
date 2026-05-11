-- ============================================================================
-- RPC IDEMPOTENCY WRAPPERS
-- ============================================================================
-- Adds idempotency-key wrappers for mutation RPCs to protect against retry
-- duplication in unstable network conditions.
--
-- Run after: docs/SECURITY_TRANSACTION_HARDENING.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS rpc_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  result_text TEXT,
  result_uuid UUID,
  result_bool BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(function_name, idempotency_key)
);

ALTER TABLE rpc_idempotency_keys ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rpc_idempotency_keys'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON rpc_idempotency_keys', pol.policyname);
  END LOOP;
END
$$;

CREATE POLICY rpc_idempotency_keys_admin_only
ON rpc_idempotency_keys FOR ALL TO authenticated
USING (has_role(ARRAY['admin']::user_role[]))
WITH CHECK (has_role(ARRAY['admin']::user_role[]));

CREATE OR REPLACE FUNCTION bill_order_idempotent(
  p_order_id UUID,
  p_billed_by UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice TEXT;
BEGIN
  IF COALESCE(TRIM(p_idempotency_key), '') <> '' THEN
    PERFORM pg_advisory_xact_lock(hashtext('bill_order_idempotent:' || p_idempotency_key));

    SELECT result_text INTO v_invoice
    FROM rpc_idempotency_keys
    WHERE function_name = 'bill_order_idempotent'
      AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN v_invoice;
    END IF;
  END IF;

  v_invoice := bill_order_atomic(p_order_id, p_billed_by);

  IF COALESCE(TRIM(p_idempotency_key), '') <> '' THEN
    INSERT INTO rpc_idempotency_keys (function_name, idempotency_key, result_text)
    VALUES ('bill_order_idempotent', p_idempotency_key, v_invoice)
    ON CONFLICT (function_name, idempotency_key) DO NOTHING;
  END IF;

  RETURN v_invoice;
END;
$$;

CREATE OR REPLACE FUNCTION create_grn_idempotent(
  p_items JSONB,
  p_po_id UUID DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_received_by UUID DEFAULT NULL,
  p_remarks TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grn_id UUID;
BEGIN
  IF COALESCE(TRIM(p_idempotency_key), '') <> '' THEN
    PERFORM pg_advisory_xact_lock(hashtext('create_grn_idempotent:' || p_idempotency_key));

    SELECT result_uuid INTO v_grn_id
    FROM rpc_idempotency_keys
    WHERE function_name = 'create_grn_idempotent'
      AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN v_grn_id;
    END IF;
  END IF;

  v_grn_id := create_grn(p_items, p_po_id, p_supplier_id, p_received_by, p_remarks);

  IF COALESCE(TRIM(p_idempotency_key), '') <> '' THEN
    INSERT INTO rpc_idempotency_keys (function_name, idempotency_key, result_uuid)
    VALUES ('create_grn_idempotent', p_idempotency_key, v_grn_id)
    ON CONFLICT (function_name, idempotency_key) DO NOTHING;
  END IF;

  RETURN v_grn_id;
END;
$$;

CREATE OR REPLACE FUNCTION create_delivery_idempotent(
  p_order_id UUID,
  p_agent_id UUID DEFAULT NULL,
  p_initiated_by UUID DEFAULT NULL,
  p_initiated_by_name TEXT DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL,
  p_vehicle_number TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_id UUID;
BEGIN
  IF COALESCE(TRIM(p_idempotency_key), '') <> '' THEN
    PERFORM pg_advisory_xact_lock(hashtext('create_delivery_idempotent:' || p_idempotency_key));

    SELECT result_uuid INTO v_delivery_id
    FROM rpc_idempotency_keys
    WHERE function_name = 'create_delivery_idempotent'
      AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN v_delivery_id;
    END IF;
  END IF;

  v_delivery_id := create_delivery(
    p_order_id,
    p_agent_id,
    p_initiated_by,
    p_initiated_by_name,
    p_driver_name,
    p_vehicle_number,
    p_created_by
  );

  IF COALESCE(TRIM(p_idempotency_key), '') <> '' THEN
    INSERT INTO rpc_idempotency_keys (function_name, idempotency_key, result_uuid)
    VALUES ('create_delivery_idempotent', p_idempotency_key, v_delivery_id)
    ON CONFLICT (function_name, idempotency_key) DO NOTHING;
  END IF;

  RETURN v_delivery_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_delivery_status_idempotent(
  p_delivery_id UUID,
  p_status delivery_status_enum,
  p_failure_reason TEXT DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  IF COALESCE(TRIM(p_idempotency_key), '') <> '' THEN
    PERFORM pg_advisory_xact_lock(hashtext('update_delivery_status_idempotent:' || p_idempotency_key));

    SELECT result_bool INTO v_updated
    FROM rpc_idempotency_keys
    WHERE function_name = 'update_delivery_status_idempotent'
      AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN v_updated;
    END IF;
  END IF;

  v_updated := update_delivery_status(p_delivery_id, p_status, p_failure_reason, p_updated_by);

  IF COALESCE(TRIM(p_idempotency_key), '') <> '' THEN
    INSERT INTO rpc_idempotency_keys (function_name, idempotency_key, result_bool)
    VALUES ('update_delivery_status_idempotent', p_idempotency_key, v_updated)
    ON CONFLICT (function_name, idempotency_key) DO NOTHING;
  END IF;

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION bill_order_idempotent(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_grn_idempotent(JSONB, UUID, UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_delivery_idempotent(UUID, UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_delivery_status_idempotent(UUID, delivery_status_enum, TEXT, UUID, TEXT) TO authenticated;

COMMIT;
