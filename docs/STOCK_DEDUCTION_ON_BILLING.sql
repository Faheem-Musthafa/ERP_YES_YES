-- ============================================================================
-- Stock Deduction on Billing - Database Functions
-- ============================================================================
-- Run this in Supabase SQL Editor
-- This creates the function that automatically deducts stock when billing
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS bill_order_atomic(UUID, UUID);

-- Create bill_order_atomic function
-- This function:
-- 1. Generates invoice number
-- 2. Updates order status to 'Billed'
-- 3. Deducts stock from the order's godown location
-- 4. Logs all stock movements
CREATE OR REPLACE FUNCTION bill_order_atomic(
    p_order_id UUID,
    p_billed_by UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_invoice_number TEXT;
    v_company TEXT;
    v_year TEXT;
    v_next_seq INTEGER;
    v_current_stock INTEGER;
    v_new_stock INTEGER;
BEGIN
    -- Get order details
    SELECT id, order_number, company, godown, status, invoice_number
    INTO v_order
    FROM orders
    WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;
    
    -- Check order is in correct status
    IF v_order.status != 'Approved' THEN
        -- If already billed, return existing invoice number
        IF v_order.status = 'Billed' OR v_order.status = 'Delivered' THEN
            RETURN v_order.invoice_number;
        END IF;
        RAISE EXCEPTION 'Order must be in Approved status to bill. Current status: %', v_order.status;
    END IF;
    
    -- Generate invoice number if not exists
    IF v_order.invoice_number IS NULL THEN
        v_company := CASE v_order.company
            WHEN 'YES YES' THEN 'YY'
            WHEN 'LLP' THEN 'LLP'
            WHEN 'Zekon' THEN 'ZK'
            ELSE 'INV'
        END;
        v_year := TO_CHAR(NOW(), 'YY');
        
        SELECT COALESCE(MAX(
            CAST(NULLIF(regexp_replace(invoice_number, '[^0-9]', '', 'g'), '') AS INTEGER)
        ), 0) + 1
        INTO v_next_seq
        FROM orders
        WHERE company = v_order.company
        AND invoice_number IS NOT NULL;
        
        v_invoice_number := v_company || '-' || v_year || '-' || LPAD(v_next_seq::TEXT, 5, '0');
    ELSE
        v_invoice_number := v_order.invoice_number;
    END IF;
    
    -- Deduct stock for each order item from the godown location
    FOR v_item IN 
        SELECT oi.product_id, oi.quantity, p.name as product_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = p_order_id
    LOOP
        -- Get current stock at godown location
        SELECT stock_qty INTO v_current_stock
        FROM product_stock_locations
        WHERE product_id = v_item.product_id
        AND location = COALESCE(v_order.godown, 'Kottakkal');
        
        -- Calculate new stock (allow 0, but not negative)
        v_new_stock := GREATEST(0, COALESCE(v_current_stock, 0) - v_item.quantity);
        
        -- Update/insert stock at location
        INSERT INTO product_stock_locations (product_id, location, stock_qty)
        VALUES (v_item.product_id, COALESCE(v_order.godown, 'Kottakkal'), v_new_stock)
        ON CONFLICT (product_id, location)
        DO UPDATE SET stock_qty = v_new_stock, updated_at = NOW();
        
        -- Log stock movement
        INSERT INTO stock_movements (
            product_id, quantity, movement_type, 
            reference_type, reference_id, location, created_by
        )
        VALUES (
            v_item.product_id, 
            -v_item.quantity,  -- Negative for deduction
            'order_billed',
            'orders',
            p_order_id,
            COALESCE(v_order.godown, 'Kottakkal'),
            p_billed_by
        );
    END LOOP;
    
    -- Update order status
    UPDATE orders
    SET status = 'Billed',
        invoice_number = v_invoice_number,
        billed_by = p_billed_by,
        billed_at = NOW()
    WHERE id = p_order_id;
    
    RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION bill_order_atomic(UUID, UUID) TO authenticated;

-- ============================================================================
-- Verify function was created
-- ============================================================================
SELECT proname, proargnames 
FROM pg_proc 
WHERE proname = 'bill_order_atomic';
