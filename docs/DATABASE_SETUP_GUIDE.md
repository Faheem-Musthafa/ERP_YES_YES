# YES YES ERP - Database Setup Guide

## Overview

This guide walks you through setting up the complete database for the YES YES ERP system using Supabase.

## Prerequisites

- Supabase account (free tier works)
- Access to Supabase SQL Editor
- The ERP frontend code cloned and ready

---

## Quick Start (5 minutes)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **New Project**
3. Choose a name (e.g., `yes-yes-erp`)
4. Set a strong database password (save it!)
5. Select region closest to you
6. Click **Create Project**
7. Wait for setup (~2 minutes)

### Step 2: Run the Schema

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the entire contents of `docs/COMPLETE_DATABASE_SCHEMA.sql`
4. Paste into the editor
5. Click **Run** (or Ctrl+Enter)
6. Wait for completion (~30 seconds)

### Step 3: Configure Frontend

1. In Supabase, go to **Settings** → **API**
2. Copy the **Project URL**
3. Copy the **anon/public** key
4. Create `.env` file in project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Test Connection

```bash
npm install
npm run dev
```

Open http://localhost:5173 - you should see the login page!

---

## Detailed Guide

### Database Structure

The ERP uses 19 tables organized into categories:

#### Core Tables (Master Data)
| Table | Purpose |
|-------|---------|
| `users` | System users with roles (admin, sales, accounts, inventory, procurement) |
| `brands` | Product brand master |
| `products` | Product catalog with SKU, pricing |
| `customers` | Customer master with addresses |
| `suppliers` | Vendor/supplier master |
| `delivery_agents` | Drivers with vehicle info |

#### Transaction Tables (Orders & Payments)
| Table | Purpose |
|-------|---------|
| `orders` | Sales orders with GST calculations |
| `order_items` | Line items for orders |
| `receipts` | Payment receipts |
| `collections` | Credit collection tracking |
| `deliveries` | Delivery assignments & tracking |

#### Procurement Tables
| Table | Purpose |
|-------|---------|
| `purchase_orders` | PO headers |
| `po_items` | PO line items |
| `grn` | Goods Receipt Notes |
| `grn_items` | GRN line items |

#### Inventory Tables
| Table | Purpose |
|-------|---------|
| `product_stock_locations` | Stock per location (KOTTAKKAL /Chenakkal) |
| `stock_transfers` | Transfer history between locations |
| `stock_adjustments` | Manual stock corrections |
| `stock_movements` | Audit trail for all stock changes |

### Data Types (Enums)

| Type | Values |
|------|--------|
| `user_role` | admin, sales, accounts, inventory, procurement |
| `company_enum` | LLP, YES YES, Zekon |
| `invoice_type_enum` | GST, NGST, IGST, Delivery Challan Out/In, Stock Transfer, Credit Note |
| `order_status_enum` | Pending, Approved, Rejected, Billed, Delivered |
| `payment_mode_enum` | Cash, Cheque, UPI, Bank Transfer |
| `delivery_status_enum` | Pending, In Transit, Delivered, Failed |
| `godown_enum` | KOTTAKKAL , Chenakkal |
| `vehicle_type_enum` | 2-Wheeler, 3-Wheeler, 4-Wheeler, Truck, Others |
| `district_enum` | All 14 Kerala districts |

### Views

| View | Purpose |
|------|---------|
| `product_stock_summary` | Aggregated stock across both locations |

### Key Features

#### 1. Location-Based Stock Tracking
- Each product has separate stock for KOTTAKKAL  and Chenakkal
- Stock transfers tracked between locations
- Complete audit trail in `stock_movements`

#### 2. Order Workflow
```
Pending → Approved → Billed → Delivered
                  ↘ Rejected
```

#### 3. GST Support
- CGST, SGST for intra-state
- IGST for inter-state
- Non-GST (NGST) option
- Credit Notes

#### 4. Auto-Generated Numbers
- Orders: `ORD-26-00001`
- Deliveries: `DEL-26-00001`
- GRN: `GRN-26-00001`
- PO: `PO-26-00001`

---

## Verification Queries

After running the schema, verify with these queries:

### Check Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected: 19 tables

### Check Enums Created
```sql
SELECT typname FROM pg_type 
WHERE typtype = 'e' 
ORDER BY typname;
```

Expected: 12 enum types

### Check RLS Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
```

Expected: 19 rows

### Test Stock View
```sql
SELECT * FROM product_stock_summary LIMIT 5;
```

---

## Sample Data (Optional)

### Create Test Brand
```sql
INSERT INTO brands (name) VALUES ('Test Brand');
```

### Create Test Product
```sql
INSERT INTO products (name, sku, mrp, dealer_price, brand_id)
SELECT 'Test Product', 'TEST-001', 100, 80, id
FROM brands WHERE name = 'Test Brand';
```

### Create Stock for Both Locations
```sql
INSERT INTO product_stock_locations (product_id, location, stock_qty)
SELECT id, 'KOTTAKKAL ', 50 FROM products WHERE sku = 'TEST-001';

INSERT INTO product_stock_locations (product_id, location, stock_qty)
SELECT id, 'Chenakkal', 30 FROM products WHERE sku = 'TEST-001';
```

### Verify Stock
```sql
SELECT * FROM product_stock_summary WHERE sku = 'TEST-001';
```

---

## Troubleshooting

### "Permission denied" errors
- Check RLS policies are created
- Ensure you're using authenticated user

### "Table does not exist" errors
- Run the full schema SQL again
- Check for errors in SQL Editor output

### "Enum type already exists" errors
- Safe to ignore - the schema uses `IF NOT EXISTS`

### Connection issues from frontend
- Verify `.env` file has correct values
- Restart dev server after changing `.env`
- Check Supabase project is not paused

### Stock shows 0 for all products
- Run Step 11 from schema (Initialize Stock Locations)
- Or manually insert into `product_stock_locations`

---

## Security Notes

### Row Level Security (RLS)
- All tables have RLS enabled
- Use least-privilege policies by role (avoid blanket authenticated full-access policies)
- Use `docs/SECURITY_TRANSACTION_HARDENING.sql` as the production baseline
- Customize policies for role-based access in production

### Environment Variables
- Never commit `.env` to git
- Use `.env.example` for documentation
- Use different keys for dev/staging/production

### Password Security
- User passwords handled by Supabase Auth
- Database password should be strong and secret
- Use service_role key only server-side

---

## Next Steps

1. ✅ Database schema created
2. ✅ Frontend connected
3. Create first admin user (via Supabase Auth)
4. Add sample data for testing
5. Configure email templates in Supabase
6. Set up backup schedule

---

## CRUD Functions Reference

The schema includes ready-to-use database functions for common operations.

### Product Functions

```sql
-- Create product with stock at both locations
SELECT create_product(
    'New Product',           -- name
    'SKU-001',               -- sku
    100.00,                  -- mrp
    80.00,                   -- dealer_price
    'brand-uuid-here',       -- brand_id (optional)
    50,                      -- initial stock KOTTAKKAL 
    30                       -- initial stock Chenakkal
);

-- Update stock at specific location
SELECT update_stock_at_location(
    'product-uuid',          -- product_id
    'KOTTAKKAL ',             -- location
    10,                      -- quantity
    'add',                   -- operation: 'add', 'subtract', 'set'
    'Reason for adjustment', -- reason (optional)
    'user-uuid'              -- user_id (optional)
);

-- Transfer stock between locations
SELECT transfer_stock(
    'product-uuid',          -- product_id
    'KOTTAKKAL ',             -- from_location
    'Chenakkal',             -- to_location
    20,                      -- quantity
    'Stock balancing',       -- reason (optional)
    'user-uuid'              -- user_id (optional)
);
```

### Order Functions

```sql
-- Create order with items
SELECT create_order(
    'YES YES',               -- company
    'GST',                   -- invoice_type
    'customer-uuid',         -- customer_id
    'KOTTAKKAL ',             -- godown
    '123 Main St, Kerala',   -- site_address
    '[
        {"product_id": "uuid1", "quantity": 5, "dealer_price": 100, "discount_pct": 10},
        {"product_id": "uuid2", "quantity": 3, "dealer_price": 50, "discount_pct": 0}
    ]'::JSONB,              -- items
    'Rush order',            -- remarks (optional)
    '2026-04-15',            -- delivery_date (optional)
    'user-uuid'              -- created_by (optional)
);

-- Approve order
SELECT approve_order('order-uuid', 'approver-uuid');

-- Reject order
SELECT reject_order('order-uuid', 'rejector-uuid', 'Out of stock');

-- Bill order (deducts stock automatically)
SELECT bill_order('order-uuid', 'biller-uuid', 'INV-2026-001');
```

### Delivery Functions

```sql
-- Create delivery
SELECT create_delivery(
    'order-uuid',            -- order_id
    'agent-uuid',            -- agent_id (optional)
    'user-uuid'              -- created_by (optional)
);

-- Update delivery status
SELECT update_delivery_status(
    'delivery-uuid',         -- delivery_id
    'Delivered',             -- status: Pending, In Transit, Delivered, Failed
    NULL                     -- failure_reason (required if Failed)
);
```

### Customer Functions

```sql
-- Create customer
SELECT create_customer(
    'John Doe',              -- name
    '9876543210',            -- phone
    '456 Oak St',            -- address
    'Calicut',               -- place (optional)
    'Kozhikode',             -- location/district (optional)
    '673001',                -- pincode (optional)
    'ABCDE1234F',            -- gst_pan (optional)
    5000.00,                 -- opening_balance (optional)
    'salesperson-uuid'       -- assigned_to (optional)
);

-- Get customer outstanding balance
SELECT get_customer_balance('customer-uuid');

-- Get customer ledger (transaction history)
SELECT * FROM get_customer_ledger('customer-uuid');
```

### GRN Functions

```sql
-- Create GRN with stock addition
SELECT create_grn(
    '[
        {"product_id": "uuid1", "expected_qty": 100, "received_qty": 98, "damaged_qty": 2, "location": "KOTTAKKAL "},
        {"product_id": "uuid2", "expected_qty": 50, "received_qty": 50, "damaged_qty": 0, "location": "Chenakkal"}
    ]'::JSONB,              -- items (required, first parameter)
    'po-uuid',               -- po_id (optional)
    'supplier-uuid',         -- supplier_id (optional)
    'receiver-uuid',         -- received_by (optional)
    'Good condition'         -- remarks (optional)
);
```

### Reporting Functions

```sql
-- Get stock by location
SELECT * FROM get_stock_by_location('KOTTAKKAL ');  -- or NULL for all
SELECT * FROM get_stock_by_location();              -- all locations

-- Get low stock products (threshold = 10 by default)
SELECT * FROM get_low_stock_products(5);            -- custom threshold
SELECT * FROM get_low_stock_products();             -- default threshold

-- Get order summary by status
SELECT * FROM get_order_summary('2026-01-01', '2026-12-31');
SELECT * FROM get_order_summary();                  -- all time
```

---

## Related Files

| File | Description |
|------|-------------|
| `docs/COMPLETE_DATABASE_SCHEMA.sql` | Full SQL migration |
| `docs/SUPABASE_SETUP.md` | Connection configuration |
| `docs/STOCK_LOCATION_MIGRATION.md` | Stock feature details |
| `src/app/types/database.ts` | TypeScript type definitions |
| `src/app/supabase.ts` | Supabase client setup |

---

## Support

For issues:
1. Check Supabase Logs → Postgres
2. Verify table structure in Table Editor
3. Test queries in SQL Editor first
4. Check browser console for frontend errors

---

**Version:** 1.0.0  
**Last Updated:** 2026-04-07
