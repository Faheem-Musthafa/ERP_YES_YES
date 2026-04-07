-- Migration: Separate Stock Tracking by Location
-- This migration creates a new table for location-based stock tracking
-- and migrates existing stock data

-- Step 1: Create product_stock_locations table
CREATE TABLE IF NOT EXISTS product_stock_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location TEXT NOT NULL CHECK (location IN ('Kottakkal', 'Chenakkal')),
    stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, location)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_stock_locations_product_id ON product_stock_locations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_locations_location ON product_stock_locations(location);
CREATE INDEX IF NOT EXISTS idx_product_stock_locations_stock_qty ON product_stock_locations(stock_qty);

-- Step 2: Enable RLS (Row Level Security)
ALTER TABLE product_stock_locations ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies (allow authenticated users to read/write)
CREATE POLICY "Allow authenticated users to view product stock locations" 
ON product_stock_locations FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert product stock locations" 
ON product_stock_locations FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update product stock locations" 
ON product_stock_locations FOR UPDATE 
TO authenticated 
USING (true);

-- Step 4: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_stock_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_stock_locations_updated_at
    BEFORE UPDATE ON product_stock_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock_locations_updated_at();

-- Step 5: Migrate existing stock data
-- For products with a location set, add stock to that location
INSERT INTO product_stock_locations (product_id, location, stock_qty)
SELECT 
    id,
    COALESCE(location, 'Kottakkal') as location,
    stock_qty
FROM products
WHERE is_active = true
ON CONFLICT (product_id, location) DO UPDATE 
SET stock_qty = EXCLUDED.stock_qty;

-- For products without location or with location set, ensure both locations exist (0 stock for the other)
INSERT INTO product_stock_locations (product_id, location, stock_qty)
SELECT 
    p.id,
    loc.location,
    0
FROM products p
CROSS JOIN (VALUES ('Kottakkal'), ('Chenakkal')) AS loc(location)
WHERE p.is_active = true
ON CONFLICT (product_id, location) DO NOTHING;

-- Step 6: Create a view for easy querying of total stock across locations
CREATE OR REPLACE VIEW product_stock_summary AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.sku,
    p.brand_id,
    SUM(psl.stock_qty) as total_stock,
    MAX(CASE WHEN psl.location = 'Kottakkal' THEN psl.stock_qty ELSE 0 END) as kottakkal_stock,
    MAX(CASE WHEN psl.location = 'Chenakkal' THEN psl.stock_qty ELSE 0 END) as chenakkal_stock
FROM products p
LEFT JOIN product_stock_locations psl ON p.id = psl.product_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.sku, p.brand_id;

-- Step 7: Update stock_movements table to include location
-- Check if location column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_movements' AND column_name = 'location'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN location TEXT CHECK (location IN ('Kottakkal', 'Chenakkal'));
        CREATE INDEX idx_stock_movements_location ON stock_movements(location);
    END IF;
END $$;

-- Step 8: Add location to GRN items if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grn_items' AND column_name = 'location'
    ) THEN
        ALTER TABLE grn_items ADD COLUMN location TEXT DEFAULT 'Kottakkal' CHECK (location IN ('Kottakkal', 'Chenakkal'));
    END IF;
END $$;

-- Step 9: Create stock transfer tracking table
CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    from_location TEXT NOT NULL CHECK (from_location IN ('Kottakkal', 'Chenakkal')),
    to_location TEXT NOT NULL CHECK (to_location IN ('Kottakkal', 'Chenakkal')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason TEXT,
    transferred_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_product_id ON stock_transfers(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from_location ON stock_transfers(from_location);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to_location ON stock_transfers(to_location);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_created_at ON stock_transfers(created_at);

-- Enable RLS
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view stock transfers" 
ON stock_transfers FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert stock transfers" 
ON stock_transfers FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Done! Migration complete.
-- Note: The old stock_qty field in products table is kept for backward compatibility
-- but should eventually be deprecated in favor of product_stock_locations
