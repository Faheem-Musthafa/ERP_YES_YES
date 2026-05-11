# Stock Location Migration Guide

## Overview
This migration implements location-based stock tracking for your ERP system, allowing separate inventory management for KOTTAKKAL  and Chenakkal locations.

## What's New

### 1. Database Changes
- **New Table**: `product_stock_locations` - Tracks stock for each product at each location
- **New Table**: `stock_transfers` - Records stock transfers between locations
- **Updated Table**: `stock_movements` - Now includes location field
- **Updated Table**: `grn_items` - Now includes location field for receiving goods
- **New View**: `product_stock_summary` - Convenient view for querying total stock across locations

### 2. UI Updates
- **StockManagement** (`/stock`) - Now shows stock split by location with location filters
- **InventoryStock** (`/inventory/stock`) - Displays KOTTAKKAL  and Chenakkal stock side by side
- **StockAdjustment** (`/inventory/adjustment`) - Now requires location selection for adjustments
- **StockTransfer** (`/inventory/transfer`) - New page for transferring stock between locations

### 3. Features
- ✅ View stock levels for each location separately or combined
- ✅ Filter by location in stock views
- ✅ Adjust stock at specific locations
- ✅ Transfer stock between KOTTAKKAL  and Chenakkal
- ✅ Complete audit trail for all stock movements
- ✅ Automatic stock movement logging
- ✅ Rollback protection on failed transactions

## Migration Steps

### Step 1: Backup Your Database
```bash
# Create a backup before running migration
# Use your Supabase dashboard or pg_dump
```

### Step 2: Run the Migration
1. Open your Supabase SQL Editor
2. Copy the contents of `docs/migration_location_stock.sql`
3. Execute the migration script
4. Verify all tables and views were created successfully

### Step 3: Verify Migration
After running the migration, verify:
```sql
-- Check that all products have stock entries for both locations
SELECT 
    p.name,
    COUNT(psl.id) as location_count,
    SUM(psl.stock_qty) as total_stock
FROM products p
LEFT JOIN product_stock_locations psl ON p.id = psl.product_id
WHERE p.is_active = true
GROUP BY p.id, p.name
HAVING COUNT(psl.id) < 2;

-- Should return no rows if migration was successful
```

### Step 4: Deploy Frontend Changes
The following files have been updated:
- `src/app/types/database.ts` - Updated type definitions
- `src/app/pages/shared/StockManagement.tsx` - Location-based stock view
- `src/app/pages/inventory/InventoryStock.tsx` - Split stock display
- `src/app/pages/inventory/StockAdjustment.tsx` - Location selector
- `src/app/pages/inventory/StockTransfer.tsx` - New transfer feature
- `src/app/App.tsx` - New route for stock transfer
- `src/app/components/Sidebar.tsx` - New menu items

## Usage Guide

### Viewing Stock by Location
1. Go to **Stock View** (`/stock`)
2. Use the **Location** filter to view:
   - All Locations (combined view)
   - KOTTAKKAL  only
   - Chenakkal only
3. Table shows stock quantities for each location

### Adjusting Stock
1. Go to **Stock Adjustment** (`/inventory/adjustment`)
2. Select a product
3. Choose the location (KOTTAKKAL  or Chenakkal)
4. Select adjustment type (Addition/Subtraction)
5. Enter quantity and reason
6. Submit - stock will be updated at the selected location

### Transferring Stock
1. Go to **Stock Transfer** (`/inventory/transfer`)
2. Select a product
3. Choose **From Location** and **To Location**
4. Enter transfer quantity
5. Optionally add a reason
6. Click **Transfer Stock**
7. View recent transfers in the history table below

### Stock Movement Audit Trail
All stock changes are logged in the `stock_movements` table with:
- Product ID
- Quantity (positive or negative)
- Movement type (adjustment, transfer_in, transfer_out, etc.)
- Location
- Reference to the source transaction
- Timestamp and user

## API/Database Queries

### Get Stock for a Product at All Locations
```sql
SELECT 
    p.name,
    p.sku,
    psl.location,
    psl.stock_qty
FROM products p
LEFT JOIN product_stock_locations psl ON p.id = psl.product_id
WHERE p.id = 'product-id-here'
ORDER BY psl.location;
```

### Get Total Stock Across Locations
```sql
SELECT * FROM product_stock_summary
WHERE product_id = 'product-id-here';
```

### Get Low Stock Items by Location
```sql
SELECT 
    p.name,
    psl.location,
    psl.stock_qty
FROM products p
JOIN product_stock_locations psl ON p.id = psl.product_id
WHERE psl.stock_qty <= 5
ORDER BY psl.stock_qty ASC, p.name;
```

### Get Stock Movement History
```sql
SELECT 
    sm.created_at,
    p.name as product_name,
    sm.quantity,
    sm.movement_type,
    sm.location,
    u.full_name as user_name
FROM stock_movements sm
JOIN products p ON sm.product_id = p.id
LEFT JOIN users u ON sm.created_by = u.id
WHERE sm.location IS NOT NULL
ORDER BY sm.created_at DESC
LIMIT 50;
```

## Backward Compatibility

The old `stock_qty` field in the `products` table is **preserved** for backward compatibility but should no longer be used for inventory management. 

**Important**: All new stock operations should use `product_stock_locations`. The old field may be deprecated in a future release.

## Troubleshooting

### Issue: Stock numbers don't match after migration
**Solution**: Run the migration data step again:
```sql
-- Re-sync stock from products to locations
INSERT INTO product_stock_locations (product_id, location, stock_qty)
SELECT 
    id,
    COALESCE(location, 'KOTTAKKAL ') as location,
    stock_qty
FROM products
WHERE is_active = true
ON CONFLICT (product_id, location) DO UPDATE 
SET stock_qty = EXCLUDED.stock_qty;
```

### Issue: Products missing from location views
**Solution**: Ensure both location entries exist:
```sql
-- Create missing location entries with 0 stock
INSERT INTO product_stock_locations (product_id, location, stock_qty)
SELECT 
    p.id,
    loc.location,
    0
FROM products p
CROSS JOIN (VALUES ('KOTTAKKAL '), ('Chenakkal')) AS loc(location)
WHERE p.is_active = true
ON CONFLICT (product_id, location) DO NOTHING;
```

### Issue: Transfer fails with "Insufficient stock"
**Cause**: Race condition or incorrect stock data
**Solution**: 
1. Check actual stock: `SELECT * FROM product_stock_locations WHERE product_id = 'xxx'`
2. Verify no pending transactions are blocking the update
3. Refresh the page and try again

## Future Enhancements (Optional)

Consider these improvements:
1. **Reorder Alerts** - Set min/max stock levels per location
2. **Auto-Transfer Suggestions** - Suggest transfers based on demand patterns
3. **Multi-step Transfers** - Allow batch transfers
4. **Stock Reconciliation** - Physical count vs system stock
5. **Location Performance** - Analytics on which location performs better

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the migration SQL for any errors in the Supabase logs
3. Verify all tables have proper RLS policies enabled
4. Check browser console for frontend errors

## Rollback (Emergency Only)

If you need to rollback the migration:
```sql
-- WARNING: This will delete all location-based stock data
DROP TABLE IF EXISTS stock_transfers CASCADE;
DROP TABLE IF EXISTS product_stock_locations CASCADE;
DROP VIEW IF EXISTS product_stock_summary CASCADE;

-- Remove location column from stock_movements
ALTER TABLE stock_movements DROP COLUMN IF EXISTS location;
ALTER TABLE grn_items DROP COLUMN IF EXISTS location;
```

**Note**: Only rollback if absolutely necessary. All location-specific stock data will be lost.
