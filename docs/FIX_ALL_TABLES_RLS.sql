-- ============================================================================
-- FIX: 403 Permission Denied on ALL Tables
-- ============================================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- This fixes RLS policies for EVERY table in your database
-- ============================================================================

-- List of all tables that need RLS policies
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'users', 'brands', 'products', 'customers', 'suppliers',
        'delivery_agents', 'orders', 'order_items', 'receipts',
        'collections', 'deliveries', 'purchase_orders', 'po_items',
        'grn', 'grn_items', 'stock_adjustments', 'stock_movements',
        'product_stock_locations', 'stock_transfers'
    ];
    pol RECORD;
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
            
            -- Enable RLS
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
            
            -- Drop all existing policies
            FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
            END LOOP;
            
            -- Create new permissive policies for authenticated users
            EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT TO authenticated USING (true)', tbl, tbl);
            EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT TO authenticated WITH CHECK (true)', tbl, tbl);
            EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE TO authenticated USING (true)', tbl, tbl);
            EXECUTE format('CREATE POLICY "%s_delete" ON %I FOR DELETE TO authenticated USING (true)', tbl, tbl);
            
            -- Grant permissions
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', tbl);
            
            RAISE NOTICE 'Fixed RLS for table: %', tbl;
        ELSE
            RAISE NOTICE 'Table not found (skipped): %', tbl;
        END IF;
    END LOOP;
END $$;

-- Verify: Show all policies
SELECT 
    tablename, 
    policyname, 
    roles::text, 
    cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- ============================================================================
-- SUCCESS! Now refresh browser and try again.
-- ============================================================================
