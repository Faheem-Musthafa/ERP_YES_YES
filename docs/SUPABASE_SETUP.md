# Supabase Database Setup Guide

## Overview

This ERP system uses Supabase as its backend database. This guide covers complete setup, connection, and migration for the location-based stock tracking system.

## Prerequisites

- Node.js 18+ installed
- Supabase account and project created
- Access to Supabase SQL Editor

## Environment Configuration

### 1. Environment Variables

Create a `.env` file in the project root with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Getting your credentials:**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **Project URL** → `VITE_SUPABASE_URL`
4. Copy the **anon/public** key → `VITE_SUPABASE_ANON_KEY`

### 2. Verify Connection

The Supabase client is configured in `src/app/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | System users with roles (admin, sales, accounts, inventory, procurement) |
| `products` | Product catalog with SKU, pricing, and brand |
| `brands` | Product brand master |
| `customers` | Customer information with billing/shipping addresses |
| `orders` | Sales orders with status tracking |
| `order_items` | Line items for each order |
| `invoices` | Generated invoices (GST, NGST, IGST, etc.) |
| `deliveries` | Delivery assignments and tracking |
| `delivery_agents` | Drivers with vehicle information |

### Stock Management Tables

| Table | Description |
|-------|-------------|
| `product_stock_locations` | **Stock per location** - Kottakkal or Chenakkal |
| `stock_movements` | Audit trail for all stock changes |
| `stock_transfers` | Records of stock moved between locations |
| `stock_adjustments` | Manual stock corrections |

### Procurement Tables

| Table | Description |
|-------|-------------|
| `suppliers` | Vendor/supplier master |
| `purchase_orders` | PO headers |
| `po_items` | PO line items |
| `grn` | Goods Receipt Notes |
| `grn_items` | GRN line items with location |

## Running Migrations

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run Location Stock Migration

Copy and paste the entire contents of `docs/migration_location_stock.sql` into the SQL Editor and execute.

This creates:
- `product_stock_locations` table
- `stock_transfers` table
- `product_stock_summary` view
- Required indexes and RLS policies
- Initial data migration from existing stock

### Step 3: Verify Migration

Run this verification query:

```sql
-- Check migration success
SELECT 
    'product_stock_locations' as table_name,
    COUNT(*) as row_count
FROM product_stock_locations
UNION ALL
SELECT 
    'stock_transfers',
    COUNT(*)
FROM stock_transfers;
```

Expected: `product_stock_locations` should have rows (2x number of products if migration included both locations).

## TypeScript Types

The database types are defined in `src/app/types/database.ts`. Key types include:

```typescript
// Location enum
export type GodownEnum = 'Kottakkal' | 'Chenakkal';

// Stock location tracking
product_stock_locations: {
    Row: {
        id: string;
        product_id: string;
        location: GodownEnum;
        stock_qty: number;
        created_at: string;
        updated_at: string;
    };
};

// Stock transfers between locations
stock_transfers: {
    Row: {
        id: string;
        product_id: string;
        from_location: GodownEnum;
        to_location: GodownEnum;
        quantity: number;
        reason: string | null;
        transferred_by: string | null;
        created_at: string;
    };
};
```

## Feature Documentation

### Stock Management Routes

| Route | Page | Description |
|-------|------|-------------|
| `/stock` | StockManagement | View stock with location filters |
| `/inventory/stock` | InventoryStock | Side-by-side location comparison |
| `/inventory/adjustment` | StockAdjustment | Adjust stock at specific location |
| `/inventory/transfer` | StockTransfer | Transfer between locations |

### Automated Stock Updates

1. **GRN Receipt** - When goods are received:
   - User selects receiving location (Kottakkal/Chenakkal)
   - Stock automatically added to that location
   - Movement logged as `grn_receipt`

2. **Order Delivery** - When delivery is marked "Delivered":
   - System reads order's `godown` field
   - Stock automatically deducted from that location
   - Movement logged as `order_delivery`

3. **Stock Transfer** - When transferring between locations:
   - Deducts from source location
   - Adds to destination location
   - Both movements logged with transfer reference
   - Transaction rollback on any failure

### Sample Queries

**Get stock for all products by location:**
```typescript
const { data, error } = await supabase
  .from('product_stock_locations')
  .select(`
    *,
    products (
      name,
      sku,
      brands (name)
    )
  `)
  .order('products(name)');
```

**Get stock for a specific product:**
```typescript
const { data, error } = await supabase
  .from('product_stock_locations')
  .select('*')
  .eq('product_id', productId);
```

**Update stock at a location:**
```typescript
const { error } = await supabase
  .from('product_stock_locations')
  .upsert({
    product_id: productId,
    location: 'Kottakkal',
    stock_qty: newQuantity
  }, {
    onConflict: 'product_id,location'
  });
```

**Insert stock movement:**
```typescript
const { error } = await supabase
  .from('stock_movements')
  .insert({
    product_id: productId,
    quantity: quantity, // positive for additions, negative for deductions
    movement_type: 'adjustment',
    reference_type: 'stock_adjustment',
    reference_id: adjustmentId,
    location: 'Chenakkal',
    created_by: userId
  });
```

## Row Level Security (RLS)

All tables should keep RLS enabled with least-privilege policies by role.

Recommended production baseline:
- Use role-aware policies (sales, accounts, inventory, procurement, admin)
- Avoid blanket `USING (true)` and `WITH CHECK (true)` policies
- Keep privileged writes inside secured RPC functions

Use this hardened migration for production policy/function setup:
- `docs/SECURITY_TRANSACTION_HARDENING.sql`
- `docs/RPC_IDEMPOTENCY_WRAPPERS.sql`
- `docs/COMPANY_PROFILE_SETTINGS_MIGRATION.sql`
- `docs/BILLING_REVERSAL_WORKFLOW.sql`

## Troubleshooting

### Connection Issues

1. **"Missing Supabase environment variables"**
   - Check `.env` file exists and has correct values
   - Restart the dev server after changing `.env`

2. **401 Unauthorized errors**
   - Verify the anon key is correct
   - Check RLS policies are set up

3. **Network/CORS errors**
   - Ensure Supabase URL is correct
   - Check browser network tab for details

### Stock Discrepancies

1. **Stock shows 0 for all products**
   - Run the data migration step in `migration_location_stock.sql`
   - Check `product_stock_locations` table has entries

2. **Missing location entries**
   ```sql
   -- Create missing entries
   INSERT INTO product_stock_locations (product_id, location, stock_qty)
   SELECT p.id, loc.location, 0
   FROM products p
   CROSS JOIN (VALUES ('Kottakkal'), ('Chenakkal')) AS loc(location)
   WHERE p.is_active = true
   ON CONFLICT (product_id, location) DO NOTHING;
   ```

### Performance Issues

- Ensure indexes exist (run migration if not)
- Use the `product_stock_summary` view for aggregated queries
- Filter by location when possible

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Related Documentation

- [Stock Location Migration Guide](./STOCK_LOCATION_MIGRATION.md) - Detailed migration steps
- [Deployment Summary](./DEPLOYMENT_SUMMARY.md) - Production deployment checklist
- [Driver Management Fix](./DRIVER_MANAGEMENT_FIX.md) - Driver system consolidation

## Support

For database issues:
1. Check Supabase logs in dashboard → **Logs** → **Postgres**
2. Verify table structure in **Table Editor**
3. Test queries in **SQL Editor** first
