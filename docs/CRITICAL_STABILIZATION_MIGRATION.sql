-- ============================================================================
-- ERP Critical Stabilization Migration
-- ============================================================================
-- Purpose:
-- 1. Make settings a repo-managed contract with admin-only access
-- 2. Align receipts with the Receipt Entry form and advance-payment support
-- 3. Upgrade delivery RPCs so create/update flows stay transactional
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Settings table + admin RLS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to manage settings" ON settings;
DROP POLICY IF EXISTS "Only admins can manage settings" ON settings;

CREATE POLICY "Only admins can manage settings"
ON settings FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM users
        WHERE users.id = auth.uid()
          AND users.role = 'admin'
          AND users.is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM users
        WHERE users.id = auth.uid()
          AND users.role = 'admin'
          AND users.is_active = true
    )
);

INSERT INTO settings (key, value) VALUES
    ('company_name', '"YES YES"'),
    ('company_gstin', '""'),
    ('company_address', '""'),
    ('company_phone', '""'),
    ('company_email', '""'),
    ('default_invoice_type', '"GST"'),
    ('enable_auto_approval', 'false'),
    ('max_discount_percentage', '20'),
    ('financial_year_start', '4'),
    ('financial_year_end', '3'),
    ('Godowns', '["Kottakkal", "Chenakkal"]'),
    ('districts', '["Kasaragod", "Kannur", "Wayanad", "Kozhikode", "Malappuram", "Palakkad", "Thrissur", "Ernakulam", "Idukki", "Kottayam", "Alappuzha", "Pathanamthitta", "Kollam", "Thiruvananthapuram"]'),
    ('vehicle_types', '["2-Wheeler", "3-Wheeler", "4-Wheeler", "Truck", "Others"]')
ON CONFLICT (key) DO NOTHING;

GRANT ALL ON settings TO authenticated;

-- ----------------------------------------------------------------------------
-- Receipt contract
-- ----------------------------------------------------------------------------

ALTER TABLE receipts ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE receipts
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id),
    ADD COLUMN IF NOT EXISTS company TEXT,
    ADD COLUMN IF NOT EXISTS brand TEXT,
    ADD COLUMN IF NOT EXISTS received_date DATE,
    ADD COLUMN IF NOT EXISTS cheque_number TEXT,
    ADD COLUMN IF NOT EXISTS cheque_date DATE,
    ADD COLUMN IF NOT EXISTS on_account_of TEXT;

ALTER TABLE receipts
    ALTER COLUMN payment_status SET DEFAULT 'Not Collected';

UPDATE receipts
SET payment_status = 'Not Collected'
WHERE payment_status IS NULL;

-- ----------------------------------------------------------------------------
-- Delivery RPC contract
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS create_delivery(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION create_delivery(
    p_order_id UUID,
    p_agent_id UUID DEFAULT NULL,
    p_initiated_by UUID DEFAULT NULL,
    p_initiated_by_name TEXT DEFAULT NULL,
    p_driver_name TEXT DEFAULT NULL,
    p_vehicle_number TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_delivery_id UUID;
    v_delivery_number TEXT;
    v_agent RECORD;
BEGIN
    v_delivery_number := generate_delivery_number();

    IF p_agent_id IS NOT NULL THEN
        SELECT name, vehicle_number
        INTO v_agent
        FROM delivery_agents
        WHERE id = p_agent_id;
    END IF;

    INSERT INTO deliveries (
        delivery_number,
        order_id,
        initiated_by,
        initiated_by_name,
        delivery_agent_id,
        driver_name,
        vehicle_number,
        status,
        created_by
    )
    VALUES (
        v_delivery_number,
        p_order_id,
        p_initiated_by,
        p_initiated_by_name,
        p_agent_id,
        COALESCE(NULLIF(TRIM(p_driver_name), ''), v_agent.name),
        COALESCE(NULLIF(TRIM(p_vehicle_number), ''), v_agent.vehicle_number),
        'Pending',
        p_created_by
    )
    RETURNING id INTO v_delivery_id;

    RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS update_delivery_status(UUID, delivery_status_enum, TEXT);

CREATE OR REPLACE FUNCTION update_delivery_status(
    p_delivery_id UUID,
    p_status delivery_status_enum,
    p_failure_reason TEXT DEFAULT NULL,
    p_updated_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_delivery RECORD;
    v_item RECORD;
    v_location Godown_enum;
BEGIN
    SELECT d.id, d.order_id, d.status AS current_status, o.status AS order_status, COALESCE(o.Godown, 'Kottakkal') AS Godown
    INTO v_delivery
    FROM deliveries d
    JOIN orders o ON o.id = d.order_id
    WHERE d.id = p_delivery_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery not found: %', p_delivery_id;
    END IF;

    v_location := v_delivery.Godown;

    IF p_status = 'Delivered' AND v_delivery.current_status <> 'Delivered' THEN
        IF v_delivery.order_status NOT IN ('Billed', 'Delivered') THEN
            FOR v_item IN
                SELECT product_id, quantity
                FROM order_items
                WHERE order_id = v_delivery.order_id
            LOOP
                INSERT INTO product_stock_locations (product_id, location, stock_qty)
                VALUES (v_item.product_id, v_location, 0)
                ON CONFLICT (product_id, location) DO NOTHING;

                UPDATE product_stock_locations
                SET stock_qty = GREATEST(0, stock_qty - v_item.quantity),
                    updated_at = NOW()
                WHERE product_id = v_item.product_id
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
                    v_item.product_id,
                    -v_item.quantity,
                    'order_delivery',
                    'delivery',
                    p_delivery_id,
                    v_location,
                    p_updated_by
                );
            END LOOP;
        END IF;

        UPDATE orders
        SET status = 'Delivered',
            updated_at = NOW()
        WHERE id = v_delivery.order_id;
    END IF;

    UPDATE deliveries
    SET status = p_status,
        failure_reason = CASE WHEN p_status = 'Failed' THEN p_failure_reason ELSE NULL END,
        dispatched_at = CASE WHEN p_status = 'In Transit' AND dispatched_at IS NULL THEN NOW() ELSE dispatched_at END,
        delivered_at = CASE WHEN p_status = 'Delivered' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END,
        updated_at = NOW()
    WHERE id = p_delivery_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_delivery(UUID, UUID, UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_delivery_status(UUID, delivery_status_enum, TEXT, UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- Atomic stock adjustment flow
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_stock_adjustment_atomic(
    p_product_id UUID,
    p_location Godown_enum,
    p_quantity INTEGER,
    p_type stock_adjustment_type_enum,
    p_reason TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_adjustment_id UUID;
    v_current_qty INTEGER;
    v_new_qty INTEGER;
BEGIN
    SELECT stock_qty
    INTO v_current_qty
    FROM product_stock_locations
    WHERE product_id = p_product_id
      AND location = p_location;

    IF v_current_qty IS NULL THEN
        INSERT INTO product_stock_locations (product_id, location, stock_qty)
        VALUES (p_product_id, p_location, 0)
        ON CONFLICT (product_id, location) DO NOTHING;
        v_current_qty := 0;
    END IF;

    v_new_qty := CASE
        WHEN p_type = 'Addition' THEN v_current_qty + p_quantity
        ELSE v_current_qty - p_quantity
    END;

    IF v_new_qty < 0 THEN
        RAISE EXCEPTION 'Stock cannot go below zero at %', p_location;
    END IF;

    INSERT INTO stock_adjustments (product_id, quantity, type, reason, adjusted_by)
    VALUES (p_product_id, p_quantity, p_type, p_reason, p_user_id)
    RETURNING id INTO v_adjustment_id;

    UPDATE product_stock_locations
    SET stock_qty = v_new_qty,
        updated_at = NOW()
    WHERE product_id = p_product_id
      AND location = p_location;

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
        p_location,
        p_user_id
    );

    RETURN v_adjustment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_stock_adjustment_atomic(UUID, Godown_enum, INTEGER, stock_adjustment_type_enum, TEXT, UUID) TO authenticated;

COMMIT;
