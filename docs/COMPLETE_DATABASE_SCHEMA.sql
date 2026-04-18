-- ============================================================================
-- YES YES ERP - Complete Database Schema
-- ============================================================================
-- Version: 1.0.0
-- Last Updated: 2026-04-07
-- Database: PostgreSQL (Supabase)
-- 
-- This script creates the complete database schema for the ERP system.
-- Run this in Supabase SQL Editor for a fresh installation.
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable Required Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 2: Create Custom Types (Enums)
-- ============================================================================

-- User roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'sales', 'accounts', 'inventory', 'procurement');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Company types
DO $$ BEGIN
    CREATE TYPE company_enum AS ENUM ('LLP', 'YES YES', 'Zekon');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Invoice types
DO $$ BEGIN
    CREATE TYPE invoice_type_enum AS ENUM (
        'GST', 'NGST', 'IGST', 
        'Delivery Challan Out', 'Delivery Challan In', 
        'Stock Transfer', 'Credit Note'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Order status
DO $$ BEGIN
    CREATE TYPE order_status_enum AS ENUM ('Pending', 'Approved', 'Rejected', 'Billed', 'Delivered');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Payment modes
DO $$ BEGIN
    CREATE TYPE payment_mode_enum AS ENUM ('Cash', 'Cheque', 'UPI', 'Bank Transfer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Collection status
DO $$ BEGIN
    CREATE TYPE collection_status_enum AS ENUM ('Pending', 'Collected', 'Overdue');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Delivery status
DO $$ BEGIN
    CREATE TYPE delivery_status_enum AS ENUM ('Pending', 'In Transit', 'Delivered', 'Failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Stock adjustment types
DO $$ BEGIN
    CREATE TYPE stock_adjustment_type_enum AS ENUM ('Addition', 'Subtraction');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Supplier status
DO $$ BEGIN
    CREATE TYPE supplier_status_enum AS ENUM ('Active', 'Inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Purchase order status
DO $$ BEGIN
    CREATE TYPE po_status_enum AS ENUM ('Draft', 'Pending', 'Approved', 'Received', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- GRN status
DO $$ BEGIN
    CREATE TYPE grn_status_enum AS ENUM ('Pending', 'Verified', 'Completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Kerala districts
DO $$ BEGIN
    CREATE TYPE district_enum AS ENUM (
        'Kasaragod', 'Kannur', 'Wayanad', 'Kozhikode', 'Malappuram', 
        'Palakkad', 'Thrissur', 'Ernakulam', 'Idukki', 'Kottayam', 
        'Alappuzha', 'Pathanamthitta', 'Kollam', 'Thiruvananthapuram'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Vehicle types
DO $$ BEGIN
    CREATE TYPE vehicle_type_enum AS ENUM ('2-Wheeler', '3-Wheeler', '4-Wheeler', 'Truck', 'Others');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Godown/Location types (Kottakkal and Chenakkal)
DO $$ BEGIN
    CREATE TYPE Godown_enum AS ENUM ('Kottakkal', 'Chenakkal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- STEP 3: Create Core Tables
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 Users Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id TEXT UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'sales',
    is_active BOOLEAN NOT NULL DEFAULT true,
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON COLUMN users.role IS 'admin, sales, accounts, inventory, procurement';

-- -----------------------------------------------------------------------------
-- 3.2 Brands Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE brands IS 'Product brand master data';

-- -----------------------------------------------------------------------------
-- 3.3 Products Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    sub_category_id UUID,
    sku TEXT NOT NULL UNIQUE,
    mrp DECIMAL(12,2) NOT NULL DEFAULT 0,
    dealer_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock_qty INTEGER NOT NULL DEFAULT 0,
    location TEXT,  -- Legacy field, use product_stock_locations instead
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE products IS 'Product catalog with pricing';
COMMENT ON COLUMN products.stock_qty IS 'DEPRECATED: Use product_stock_locations for location-based stock';
COMMENT ON COLUMN products.location IS 'Legacy field for default location';

CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- -----------------------------------------------------------------------------
-- 3.4 Customers Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    place TEXT,
    location district_enum,
    pincode TEXT,
    gst_pan TEXT,
    opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE customers IS 'Customer master data';
COMMENT ON COLUMN customers.location IS 'Kerala district for delivery routing';
COMMENT ON COLUMN customers.assigned_to IS 'Sales person assigned to this customer';

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_location ON customers(location);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON customers(assigned_to);

-- -----------------------------------------------------------------------------
-- 3.5 Suppliers Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    status supplier_status_enum NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE suppliers IS 'Vendor/supplier master for procurement';

-- -----------------------------------------------------------------------------
-- 3.6 Delivery Agents Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    vehicle_number TEXT,
    vehicle_type vehicle_type_enum,
    vehicle_type_other TEXT,  -- For 'Others' vehicle type
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE delivery_agents IS 'Delivery drivers and their vehicles';
COMMENT ON COLUMN delivery_agents.vehicle_type_other IS 'Custom vehicle type when vehicle_type is Others';

CREATE INDEX IF NOT EXISTS idx_delivery_agents_is_active ON delivery_agents(is_active);

-- ============================================================================
-- STEP 4: Create Transaction Tables
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 Orders Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    company company_enum NOT NULL,
    invoice_type invoice_type_enum NOT NULL,
    invoice_number TEXT,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    Godown Godown_enum,  -- Which location to fulfill from
    site_address TEXT NOT NULL,
    remarks TEXT,
    delivery_date DATE,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    status order_status_enum NOT NULL DEFAULT 'Pending',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    billed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    billed_at TIMESTAMPTZ,
    taxable_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    igst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    invoice_pdf_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE orders IS 'Sales orders with GST calculations';
COMMENT ON COLUMN orders.Godown IS 'Location to fulfill order from (Kottakkal/Chenakkal)';
COMMENT ON COLUMN orders.invoice_type IS 'GST, NGST, IGST, Delivery Challan, etc.';

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_Godown ON orders(Godown);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- -----------------------------------------------------------------------------
-- 4.2 Order Items Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    dealer_price DECIMAL(12,2) NOT NULL,
    discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE order_items IS 'Line items for each order';
COMMENT ON COLUMN order_items.amount IS 'Calculated: quantity * dealer_price * (1 - discount_pct/100)';

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- -----------------------------------------------------------------------------
-- 4.3 Receipts Table (Payments)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number TEXT NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_mode payment_mode_enum NOT NULL,
    payment_status TEXT DEFAULT 'Not Collected',
    bounce_reason TEXT,  -- For cheque bounces
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE receipts IS 'Payment receipts against orders';
COMMENT ON COLUMN receipts.bounce_reason IS 'Reason if cheque payment bounced';

CREATE INDEX IF NOT EXISTS idx_receipts_order_id ON receipts(order_id);

-- -----------------------------------------------------------------------------
-- 4.4 Collections Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    due_date DATE NOT NULL,
    collected_date DATE,
    status collection_status_enum NOT NULL DEFAULT 'Pending',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE collections IS 'Payment collection tracking for credit sales';

CREATE INDEX IF NOT EXISTS idx_collections_order_id ON collections(order_id);
CREATE INDEX IF NOT EXISTS idx_collections_customer_id ON collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_collections_status ON collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_due_date ON collections(due_date);

-- -----------------------------------------------------------------------------
-- 4.5 Deliveries Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_number TEXT NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    initiated_by_name TEXT,
    delivery_agent_id UUID REFERENCES delivery_agents(id) ON DELETE SET NULL,
    driver_name TEXT,
    vehicle_number TEXT,
    status delivery_status_enum NOT NULL DEFAULT 'Pending',
    failure_reason TEXT,  -- Required when status is 'Failed'
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE deliveries IS 'Delivery tracking for orders';
COMMENT ON COLUMN deliveries.failure_reason IS 'Reason if delivery failed';

CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_agent_id ON deliveries(delivery_agent_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

-- ============================================================================
-- STEP 5: Create Procurement Tables
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 5.1 Purchase Orders Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number TEXT NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    status po_status_enum NOT NULL DEFAULT 'Draft',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expected_delivery_date DATE,
    delivered_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE purchase_orders IS 'Purchase orders to suppliers';

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- -----------------------------------------------------------------------------
-- 5.2 PO Items Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS po_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE po_items IS 'Line items for purchase orders';

CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON po_items(po_id);

-- -----------------------------------------------------------------------------
-- 5.3 GRN (Goods Receipt Note) Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grn (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_number TEXT NOT NULL UNIQUE,
    po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    received_by UUID REFERENCES users(id) ON DELETE SET NULL,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE grn IS 'Goods Receipt Notes for incoming stock';

CREATE INDEX IF NOT EXISTS idx_grn_po_id ON grn(po_id);

-- -----------------------------------------------------------------------------
-- 5.4 GRN Items Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grn_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_id UUID NOT NULL REFERENCES grn(id) ON DELETE CASCADE,
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    expected_qty INTEGER NOT NULL DEFAULT 0,
    received_qty INTEGER NOT NULL DEFAULT 0 CHECK (received_qty >= 0),
    damaged_qty INTEGER NOT NULL DEFAULT 0 CHECK (damaged_qty >= 0),
    location Godown_enum,  -- Where the goods are received
    status grn_status_enum NOT NULL DEFAULT 'Pending',
    received_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE grn_items IS 'Line items for goods receipt';
COMMENT ON COLUMN grn_items.location IS 'Receiving location (Kottakkal/Chenakkal)';

CREATE INDEX IF NOT EXISTS idx_grn_items_grn_id ON grn_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_product_id ON grn_items(product_id);

-- ============================================================================
-- STEP 6: Create Inventory/Stock Tables
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 6.1 Product Stock Locations Table (Location-based Stock)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_stock_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location Godown_enum NOT NULL,
    stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, location)
);

COMMENT ON TABLE product_stock_locations IS 'Stock quantity per product per location';
COMMENT ON COLUMN product_stock_locations.location IS 'Kottakkal or Chenakkal Godown';

CREATE INDEX IF NOT EXISTS idx_product_stock_locations_product_id ON product_stock_locations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_locations_location ON product_stock_locations(location);
CREATE INDEX IF NOT EXISTS idx_product_stock_locations_stock_qty ON product_stock_locations(stock_qty);

-- -----------------------------------------------------------------------------
-- 6.2 Stock Transfers Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    from_location Godown_enum NOT NULL,
    to_location Godown_enum NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason TEXT,
    transferred_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT different_locations CHECK (from_location != to_location)
);

COMMENT ON TABLE stock_transfers IS 'Stock transfer history between locations';

CREATE INDEX IF NOT EXISTS idx_stock_transfers_product_id ON stock_transfers(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from_location ON stock_transfers(from_location);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to_location ON stock_transfers(to_location);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_created_at ON stock_transfers(created_at DESC);

-- -----------------------------------------------------------------------------
-- 6.3 Stock Adjustments Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    type stock_adjustment_type_enum NOT NULL,
    reason TEXT NOT NULL,
    location Godown_enum,  -- Which location was adjusted
    adjusted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stock_adjustments IS 'Manual stock adjustments with reasons';

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product_id ON stock_adjustments(product_id);

-- -----------------------------------------------------------------------------
-- 6.4 Stock Movements Table (Audit Trail)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,  -- Positive for additions, negative for deductions
    movement_type TEXT NOT NULL,  -- grn_receipt, order_delivery, adjustment, transfer_in, transfer_out
    reference_type TEXT,  -- orders, grn_items, stock_adjustments, stock_transfers
    reference_id UUID,
    location Godown_enum,  -- Which location was affected
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stock_movements IS 'Complete audit trail of all stock changes';
COMMENT ON COLUMN stock_movements.movement_type IS 'grn_receipt, order_delivery, adjustment, transfer_in, transfer_out';
COMMENT ON COLUMN stock_movements.quantity IS 'Positive = stock added, Negative = stock removed';

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_location ON stock_movements(location);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);

-- ============================================================================
-- STEP 7: Create Views
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 7.1 Product Stock Summary View
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW product_stock_summary AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.sku,
    b.name as brand_name,
    COALESCE(SUM(psl.stock_qty), 0) as total_stock,
    COALESCE(MAX(CASE WHEN psl.location = 'Kottakkal' THEN psl.stock_qty END), 0) as kottakkal_stock,
    COALESCE(MAX(CASE WHEN psl.location = 'Chenakkal' THEN psl.stock_qty END), 0) as chenakkal_stock
FROM products p
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN product_stock_locations psl ON p.id = psl.product_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.sku, b.name;

COMMENT ON VIEW product_stock_summary IS 'Aggregated stock view across all locations';

-- ============================================================================
-- STEP 8: Create Triggers for Updated Timestamps
-- ============================================================================

-- Generic function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name = 'updated_at'
        AND table_name NOT LIKE 'pg_%'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trigger_update_%s_updated_at ON %I;
            CREATE TRIGGER trigger_update_%s_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 9: Enable Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 10: Create RLS Policies (Allow authenticated users full access)
-- ============================================================================

-- Helper function to create standard policies
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
    LOOP
        -- Drop existing policies
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated select" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated insert" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated update" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated delete" ON %I', t);
        
        -- Create new policies
        EXECUTE format('
            CREATE POLICY "Allow authenticated select" ON %I
            FOR SELECT TO authenticated USING (true)
        ', t);
        
        EXECUTE format('
            CREATE POLICY "Allow authenticated insert" ON %I
            FOR INSERT TO authenticated WITH CHECK (true)
        ', t);
        
        EXECUTE format('
            CREATE POLICY "Allow authenticated update" ON %I
            FOR UPDATE TO authenticated USING (true)
        ', t);
        
        EXECUTE format('
            CREATE POLICY "Allow authenticated delete" ON %I
            FOR DELETE TO authenticated USING (true)
        ', t);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 11: Initialize Stock Locations for Existing Products
-- ============================================================================

-- Create stock entries for both locations for all active products
INSERT INTO product_stock_locations (product_id, location, stock_qty)
SELECT 
    p.id,
    loc.location::Godown_enum,
    CASE 
        WHEN loc.location = 'Kottakkal' THEN COALESCE(p.stock_qty, 0)
        ELSE 0 
    END
FROM products p
CROSS JOIN (VALUES ('Kottakkal'), ('Chenakkal')) AS loc(location)
WHERE p.is_active = true
ON CONFLICT (product_id, location) DO NOTHING;

-- ============================================================================
-- STEP 12: Create Helper Functions
-- ============================================================================

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT := 'ORD';
    year_suffix TEXT := TO_CHAR(NOW(), 'YY');
    next_seq INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 8) AS INTEGER)), 0) + 1
    INTO next_seq
    FROM orders
    WHERE order_number LIKE prefix || '-' || year_suffix || '-%';
    
    RETURN prefix || '-' || year_suffix || '-' || LPAD(next_seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate delivery numbers
CREATE OR REPLACE FUNCTION generate_delivery_number()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT := 'DEL';
    year_suffix TEXT := TO_CHAR(NOW(), 'YY');
    next_seq INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(delivery_number FROM 8) AS INTEGER)), 0) + 1
    INTO next_seq
    FROM deliveries
    WHERE delivery_number LIKE prefix || '-' || year_suffix || '-%';
    
    RETURN prefix || '-' || year_suffix || '-' || LPAD(next_seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate GRN numbers
CREATE OR REPLACE FUNCTION generate_grn_number()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT := 'GRN';
    year_suffix TEXT := TO_CHAR(NOW(), 'YY');
    next_seq INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(grn_number FROM 8) AS INTEGER)), 0) + 1
    INTO next_seq
    FROM grn
    WHERE grn_number LIKE prefix || '-' || year_suffix || '-%';
    
    RETURN prefix || '-' || year_suffix || '-' || LPAD(next_seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate PO numbers
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT := 'PO';
    year_suffix TEXT := TO_CHAR(NOW(), 'YY');
    next_seq INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 7) AS INTEGER)), 0) + 1
    INTO next_seq
    FROM purchase_orders
    WHERE po_number LIKE prefix || '-' || year_suffix || '-%';
    
    RETURN prefix || '-' || year_suffix || '-' || LPAD(next_seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 13: CRUD Helper Functions
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 13.1 Product CRUD Functions
-- -----------------------------------------------------------------------------

-- Create Product with Stock Initialization
CREATE OR REPLACE FUNCTION create_product(
    p_name TEXT,
    p_sku TEXT,
    p_mrp DECIMAL,
    p_dealer_price DECIMAL,
    p_brand_id UUID DEFAULT NULL,
    p_initial_stock_kottakkal INTEGER DEFAULT 0,
    p_initial_stock_chenakkal INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    v_product_id UUID;
BEGIN
    -- Insert product
    INSERT INTO products (name, sku, mrp, dealer_price, brand_id, stock_qty)
    VALUES (p_name, p_sku, p_mrp, p_dealer_price, p_brand_id, p_initial_stock_kottakkal + p_initial_stock_chenakkal)
    RETURNING id INTO v_product_id;
    
    -- Create stock entries for both locations
    INSERT INTO product_stock_locations (product_id, location, stock_qty)
    VALUES 
        (v_product_id, 'Kottakkal', p_initial_stock_kottakkal),
        (v_product_id, 'Chenakkal', p_initial_stock_chenakkal);
    
    RETURN v_product_id;
END;
$$ LANGUAGE plpgsql;

-- Update Product Stock at Location
CREATE OR REPLACE FUNCTION update_stock_at_location(
    p_product_id UUID,
    p_location Godown_enum,
    p_quantity INTEGER,
    p_operation TEXT,  -- 'add', 'subtract', 'set'
    p_reason TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_current_qty INTEGER;
    v_new_qty INTEGER;
BEGIN
    -- Get current stock
    SELECT stock_qty INTO v_current_qty
    FROM product_stock_locations
    WHERE product_id = p_product_id AND location = p_location;
    
    IF v_current_qty IS NULL THEN
        -- Create entry if doesn't exist
        INSERT INTO product_stock_locations (product_id, location, stock_qty)
        VALUES (p_product_id, p_location, 0);
        v_current_qty := 0;
    END IF;
    
    -- Calculate new quantity
    CASE p_operation
        WHEN 'add' THEN v_new_qty := v_current_qty + p_quantity;
        WHEN 'subtract' THEN v_new_qty := GREATEST(0, v_current_qty - p_quantity);
        WHEN 'set' THEN v_new_qty := p_quantity;
        ELSE RAISE EXCEPTION 'Invalid operation: %', p_operation;
    END CASE;
    
    -- Update stock
    UPDATE product_stock_locations
    SET stock_qty = v_new_qty, updated_at = NOW()
    WHERE product_id = p_product_id AND location = p_location;
    
    -- Log movement
    INSERT INTO stock_movements (product_id, quantity, movement_type, location, created_by)
    VALUES (
        p_product_id,
        CASE p_operation 
            WHEN 'add' THEN p_quantity 
            WHEN 'subtract' THEN -p_quantity
            ELSE v_new_qty - v_current_qty
        END,
        'adjustment',
        p_location,
        p_user_id
    );
    
    RETURN v_new_qty;
END;
$$ LANGUAGE plpgsql;

-- Transfer Stock Between Locations
CREATE OR REPLACE FUNCTION transfer_stock(
    p_product_id UUID,
    p_from_location Godown_enum,
    p_to_location Godown_enum,
    p_quantity INTEGER,
    p_reason TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_from_stock INTEGER;
    v_transfer_id UUID;
BEGIN
    -- Validate locations are different
    IF p_from_location = p_to_location THEN
        RAISE EXCEPTION 'Cannot transfer to same location';
    END IF;
    
    -- Check source stock
    SELECT stock_qty INTO v_from_stock
    FROM product_stock_locations
    WHERE product_id = p_product_id AND location = p_from_location;
    
    IF v_from_stock IS NULL OR v_from_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock at % (available: %)', p_from_location, COALESCE(v_from_stock, 0);
    END IF;
    
    -- Create transfer record
    INSERT INTO stock_transfers (product_id, from_location, to_location, quantity, reason, transferred_by)
    VALUES (p_product_id, p_from_location, p_to_location, p_quantity, p_reason, p_user_id)
    RETURNING id INTO v_transfer_id;
    
    -- Deduct from source
    UPDATE product_stock_locations
    SET stock_qty = stock_qty - p_quantity, updated_at = NOW()
    WHERE product_id = p_product_id AND location = p_from_location;
    
    -- Add to destination (upsert)
    INSERT INTO product_stock_locations (product_id, location, stock_qty)
    VALUES (p_product_id, p_to_location, p_quantity)
    ON CONFLICT (product_id, location) 
    DO UPDATE SET stock_qty = product_stock_locations.stock_qty + p_quantity, updated_at = NOW();
    
    -- Log movements
    INSERT INTO stock_movements (product_id, quantity, movement_type, reference_type, reference_id, location, created_by)
    VALUES 
        (p_product_id, -p_quantity, 'transfer_out', 'stock_transfers', v_transfer_id, p_from_location, p_user_id),
        (p_product_id, p_quantity, 'transfer_in', 'stock_transfers', v_transfer_id, p_to_location, p_user_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 13.2 Order CRUD Functions
-- -----------------------------------------------------------------------------

-- Create Order with Items
CREATE OR REPLACE FUNCTION create_order(
    p_company company_enum,
    p_invoice_type invoice_type_enum,
    p_customer_id UUID,
    p_Godown Godown_enum,
    p_site_address TEXT,
    p_items JSONB,  -- Array of {product_id, quantity, dealer_price, discount_pct}
    p_remarks TEXT DEFAULT NULL,
    p_delivery_date DATE DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_order_number TEXT;
    v_item JSONB;
    v_subtotal DECIMAL := 0;
    v_total_discount DECIMAL := 0;
    v_item_amount DECIMAL;
    v_item_discount DECIMAL;
BEGIN
    -- Generate order number
    v_order_number := generate_order_number();
    
    -- Create order header
    INSERT INTO orders (
        order_number, company, invoice_type, customer_id, Godown,
        site_address, remarks, delivery_date, created_by, status
    )
    VALUES (
        v_order_number, p_company, p_invoice_type, p_customer_id, p_Godown,
        p_site_address, p_remarks, p_delivery_date, p_created_by, 'Pending'
    )
    RETURNING id INTO v_order_id;
    
    -- Create order items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_amount := (v_item->>'quantity')::INTEGER * (v_item->>'dealer_price')::DECIMAL;
        v_item_discount := v_item_amount * COALESCE((v_item->>'discount_pct')::DECIMAL, 0) / 100;
        
        INSERT INTO order_items (order_id, product_id, quantity, dealer_price, discount_pct, amount)
        VALUES (
            v_order_id,
            (v_item->>'product_id')::UUID,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'dealer_price')::DECIMAL,
            COALESCE((v_item->>'discount_pct')::DECIMAL, 0),
            v_item_amount - v_item_discount
        );
        
        v_subtotal := v_subtotal + v_item_amount;
        v_total_discount := v_total_discount + v_item_discount;
    END LOOP;
    
    -- Update order totals
    UPDATE orders
    SET subtotal = v_subtotal,
        total_discount = v_total_discount,
        grand_total = v_subtotal - v_total_discount
    WHERE id = v_order_id;
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- Approve Order
CREATE OR REPLACE FUNCTION approve_order(
    p_order_id UUID,
    p_approved_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE orders
    SET status = 'Approved',
        approved_by = p_approved_by,
        approved_at = NOW()
    WHERE id = p_order_id AND status = 'Pending';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Reject Order
CREATE OR REPLACE FUNCTION reject_order(
    p_order_id UUID,
    p_rejected_by UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE orders
    SET status = 'Rejected',
        approved_by = p_rejected_by,
        approved_at = NOW(),
        remarks = COALESCE(remarks || ' | Rejected: ', 'Rejected: ') || COALESCE(p_reason, 'No reason provided')
    WHERE id = p_order_id AND status = 'Pending';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Bill Order (with stock deduction)
CREATE OR REPLACE FUNCTION bill_order(
    p_order_id UUID,
    p_billed_by UUID,
    p_invoice_number TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
BEGIN
    -- Get order details
    SELECT * INTO v_order FROM orders WHERE id = p_order_id AND status = 'Approved';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found or not in Approved status';
    END IF;
    
    -- Deduct stock for each item
    FOR v_item IN 
        SELECT oi.product_id, oi.quantity 
        FROM order_items oi 
        WHERE oi.order_id = p_order_id
    LOOP
        -- Deduct from order's Godown location
        UPDATE product_stock_locations
        SET stock_qty = GREATEST(0, stock_qty - v_item.quantity), updated_at = NOW()
        WHERE product_id = v_item.product_id AND location = v_order.Godown;
        
        -- Log movement
        INSERT INTO stock_movements (product_id, quantity, movement_type, reference_type, reference_id, location, created_by)
        VALUES (v_item.product_id, -v_item.quantity, 'order_billed', 'orders', p_order_id, v_order.Godown, p_billed_by);
    END LOOP;
    
    -- Update order status
    UPDATE orders
    SET status = 'Billed',
        billed_by = p_billed_by,
        billed_at = NOW(),
        invoice_number = COALESCE(p_invoice_number, invoice_number)
    WHERE id = p_order_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 13.3 Delivery CRUD Functions
-- -----------------------------------------------------------------------------

-- Create Delivery
CREATE OR REPLACE FUNCTION create_delivery(
    p_order_id UUID,
    p_agent_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_delivery_id UUID;
    v_delivery_number TEXT;
    v_agent RECORD;
BEGIN
    -- Generate delivery number
    v_delivery_number := generate_delivery_number();
    
    -- Get agent details if provided
    IF p_agent_id IS NOT NULL THEN
        SELECT name, vehicle_number INTO v_agent
        FROM delivery_agents WHERE id = p_agent_id;
    END IF;
    
    -- Create delivery
    INSERT INTO deliveries (
        delivery_number, order_id, delivery_agent_id,
        driver_name, vehicle_number, status, created_by
    )
    VALUES (
        v_delivery_number, p_order_id, p_agent_id,
        v_agent.name, v_agent.vehicle_number, 'Pending', p_created_by
    )
    RETURNING id INTO v_delivery_id;
    
    RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql;

-- Update Delivery Status
CREATE OR REPLACE FUNCTION update_delivery_status(
    p_delivery_id UUID,
    p_status delivery_status_enum,
    p_failure_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE deliveries
    SET status = p_status,
        failure_reason = CASE WHEN p_status = 'Failed' THEN p_failure_reason ELSE NULL END,
        dispatched_at = CASE WHEN p_status = 'In Transit' THEN NOW() ELSE dispatched_at END,
        delivered_at = CASE WHEN p_status = 'Delivered' THEN NOW() ELSE delivered_at END
    WHERE id = p_delivery_id;
    
    -- Update order status if delivered
    IF p_status = 'Delivered' THEN
        UPDATE orders
        SET status = 'Delivered'
        WHERE id = (SELECT order_id FROM deliveries WHERE id = p_delivery_id);
    END IF;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 13.4 Customer CRUD Functions
-- -----------------------------------------------------------------------------

-- Create Customer
CREATE OR REPLACE FUNCTION create_customer(
    p_name TEXT,
    p_phone TEXT,
    p_address TEXT,
    p_place TEXT DEFAULT NULL,
    p_location district_enum DEFAULT NULL,
    p_pincode TEXT DEFAULT NULL,
    p_gst_pan TEXT DEFAULT NULL,
    p_opening_balance DECIMAL DEFAULT 0,
    p_assigned_to UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_customer_id UUID;
BEGIN
    INSERT INTO customers (
        name, phone, address, place, location, 
        pincode, gst_pan, opening_balance, assigned_to
    )
    VALUES (
        p_name, p_phone, p_address, p_place, p_location,
        p_pincode, p_gst_pan, p_opening_balance, p_assigned_to
    )
    RETURNING id INTO v_customer_id;
    
    RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Get Customer Balance
CREATE OR REPLACE FUNCTION get_customer_balance(p_customer_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_opening DECIMAL;
    v_orders_total DECIMAL;
    v_receipts_total DECIMAL;
BEGIN
    SELECT opening_balance INTO v_opening FROM customers WHERE id = p_customer_id;
    
    SELECT COALESCE(SUM(grand_total), 0) INTO v_orders_total
    FROM orders WHERE customer_id = p_customer_id AND status IN ('Billed', 'Delivered');
    
    SELECT COALESCE(SUM(r.amount), 0) INTO v_receipts_total
    FROM receipts r
    JOIN orders o ON r.order_id = o.id
    WHERE o.customer_id = p_customer_id
      AND r.payment_status IN ('Received', 'Credited', 'Cleared');
    
    RETURN v_opening + v_orders_total - v_receipts_total;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 13.5 GRN CRUD Functions
-- -----------------------------------------------------------------------------

-- Create GRN with Stock Addition
CREATE OR REPLACE FUNCTION create_grn(
    p_items JSONB,  -- Array of {product_id, expected_qty, received_qty, damaged_qty, location}
    p_po_id UUID DEFAULT NULL,
    p_supplier_id UUID DEFAULT NULL,
    p_received_by UUID DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_grn_id UUID;
    v_grn_number TEXT;
    v_item JSONB;
    v_net_qty INTEGER;
BEGIN
    -- Generate GRN number
    v_grn_number := generate_grn_number();
    
    -- Create GRN header
    INSERT INTO grn (grn_number, po_id, supplier_id, received_by, remarks)
    VALUES (v_grn_number, p_po_id, p_supplier_id, p_received_by, p_remarks)
    RETURNING id INTO v_grn_id;
    
    -- Create GRN items and update stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_net_qty := (v_item->>'received_qty')::INTEGER - COALESCE((v_item->>'damaged_qty')::INTEGER, 0);
        
        -- Insert GRN item
        INSERT INTO grn_items (
            grn_id, purchase_order_id, product_id, 
            expected_qty, received_qty, damaged_qty, 
            location, status, received_date
        )
        VALUES (
            v_grn_id, p_po_id, (v_item->>'product_id')::UUID,
            COALESCE((v_item->>'expected_qty')::INTEGER, 0),
            (v_item->>'received_qty')::INTEGER,
            COALESCE((v_item->>'damaged_qty')::INTEGER, 0),
            (v_item->>'location')::Godown_enum,
            'Completed',
            CURRENT_DATE
        );
        
        -- Update stock at location
        INSERT INTO product_stock_locations (product_id, location, stock_qty)
        VALUES ((v_item->>'product_id')::UUID, (v_item->>'location')::Godown_enum, v_net_qty)
        ON CONFLICT (product_id, location)
        DO UPDATE SET stock_qty = product_stock_locations.stock_qty + v_net_qty, updated_at = NOW();
        
        -- Log stock movement
        INSERT INTO stock_movements (product_id, quantity, movement_type, reference_type, reference_id, location, created_by)
        VALUES (
            (v_item->>'product_id')::UUID,
            v_net_qty,
            'grn_receipt',
            'grn',
            v_grn_id,
            (v_item->>'location')::Godown_enum,
            p_received_by
        );
    END LOOP;
    
    -- Update PO status if linked
    IF p_po_id IS NOT NULL THEN
        UPDATE purchase_orders
        SET status = 'Received', delivered_at = NOW()
        WHERE id = p_po_id;
    END IF;
    
    RETURN v_grn_id;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 13.6 Reporting Functions
-- -----------------------------------------------------------------------------

-- Get Stock Summary by Location
CREATE OR REPLACE FUNCTION get_stock_by_location(p_location Godown_enum DEFAULT NULL)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    sku TEXT,
    brand_name TEXT,
    location Godown_enum,
    stock_qty INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.sku,
        b.name,
        psl.location,
        psl.stock_qty
    FROM products p
    LEFT JOIN brands b ON p.brand_id = b.id
    JOIN product_stock_locations psl ON p.id = psl.product_id
    WHERE p.is_active = true
    AND (p_location IS NULL OR psl.location = p_location)
    ORDER BY p.name, psl.location;
END;
$$ LANGUAGE plpgsql;

-- Get Low Stock Products
CREATE OR REPLACE FUNCTION get_low_stock_products(p_threshold INTEGER DEFAULT 10)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    sku TEXT,
    location Godown_enum,
    stock_qty INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.sku,
        psl.location,
        psl.stock_qty
    FROM products p
    JOIN product_stock_locations psl ON p.id = psl.product_id
    WHERE p.is_active = true
    AND psl.stock_qty <= p_threshold
    ORDER BY psl.stock_qty ASC, p.name;
END;
$$ LANGUAGE plpgsql;

-- Get Order Summary
CREATE OR REPLACE FUNCTION get_order_summary(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    status order_status_enum,
    order_count BIGINT,
    total_amount DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.status,
        COUNT(*),
        COALESCE(SUM(o.grand_total), 0)
    FROM orders o
    WHERE (p_start_date IS NULL OR o.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR o.created_at::DATE <= p_end_date)
    GROUP BY o.status
    ORDER BY o.status;
END;
$$ LANGUAGE plpgsql;

-- Get Customer Ledger
CREATE OR REPLACE FUNCTION get_customer_ledger(p_customer_id UUID)
RETURNS TABLE (
    transaction_date TIMESTAMPTZ,
    transaction_type TEXT,
    reference_number TEXT,
    debit DECIMAL,
    credit DECIMAL,
    balance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH transactions AS (
        -- Orders (debit)
        SELECT 
            o.created_at as txn_date,
            'Invoice' as txn_type,
            o.invoice_number as ref_no,
            o.grand_total as debit_amt,
            0::DECIMAL as credit_amt
        FROM orders o
        WHERE o.customer_id = p_customer_id
        AND o.status IN ('Billed', 'Delivered')
        
        UNION ALL
        
        -- Receipts (credit)
        SELECT 
            r.created_at,
            'Receipt',
            r.receipt_number,
            0::DECIMAL,
            r.amount
        FROM receipts r
        JOIN orders o ON r.order_id = o.id
        WHERE o.customer_id = p_customer_id
          AND r.payment_status IN ('Received', 'Credited', 'Cleared')
    )
    SELECT 
        t.txn_date,
        t.txn_type,
        t.ref_no,
        t.debit_amt,
        t.credit_amt,
        SUM(t.debit_amt - t.credit_amt) OVER (ORDER BY t.txn_date) as running_balance
    FROM transactions t
    ORDER BY t.txn_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SCHEMA COMPLETE!
-- ============================================================================

-- Print summary
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'YES YES ERP Database Schema Created!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tables created: 19';
    RAISE NOTICE 'Views created: 1';
    RAISE NOTICE 'CRUD Functions created: 20+';
    RAISE NOTICE 'RLS enabled on all tables';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'CRUD Functions Available:';
    RAISE NOTICE '  Products: create_product, update_stock_at_location, transfer_stock';
    RAISE NOTICE '  Orders: create_order, approve_order, reject_order, bill_order';
    RAISE NOTICE '  Deliveries: create_delivery, update_delivery_status';
    RAISE NOTICE '  Customers: create_customer, get_customer_balance, get_customer_ledger';
    RAISE NOTICE '  GRN: create_grn';
    RAISE NOTICE '  Reports: get_stock_by_location, get_low_stock_products, get_order_summary';
    RAISE NOTICE '============================================';
END $$;
