# YES YES Marketing ERP — Complete Workflow Documentation

> **Last updated:** March 2026  
> **Stack:** React 18 · TypeScript · Supabase · Tailwind CSS · Vite

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles & Access](#2-user-roles--access)
3. [Core Workflow: Order-to-Cash](#3-core-workflow-order-to-cash)
4. [Module Workflows](#4-module-workflows)
   - 4.1 [Admin Module](#41-admin-module)
   - 4.2 [Sales Module](#42-sales-module)
   - 4.3 [Accounts Module](#43-accounts-module)
   - 4.4 [Inventory Module](#44-inventory-module)
   - 4.5 [Procurement Module](#45-procurement-module)
5. [Database Tables & Relationships](#5-database-tables--relationships)
6. [Order Status Lifecycle](#6-order-status-lifecycle)
7. [Known Gaps & Upcoming Features](#7-known-gaps--upcoming-features)
8. [SQL Migration Reference](#8-sql-migration-reference)

---

## 1. System Overview

YES YES Marketing ERP is a multi-role, web-based enterprise resource planning system used to manage the full business cycle — from customer orders to delivery, inventory management, supplier procurement, and financial collection.

```
┌─────────────────────────────────────────────────────┐
│                  YES YES Marketing ERP               │
│                                                     │
│  Sales ──► Accounts ──► Inventory ──► Customer      │
│                ▲                                    │
│           Admin (full access)                       │
│                                                     │
│  Procurement ──► Inventory (stock replenishment)    │
└─────────────────────────────────────────────────────┘
```

**Companies supported:** LLP · YES YES · Zekon  
**Invoice types:** GST · NGST · IGST · Delivery Challan Out/In · Stock Transfer · Credit Note

---

## 2. User Roles & Access

| Role | Dashboard | Key capabilities |
|------|-----------|-----------------|
| **Admin** | `/admin` | Full system access — all modules, team management, reports |
| **Sales** | `/sales` | Create orders, record receipts, view own collection |
| **Accounts** | `/accounts` | Approve/reject orders, view all sales records, collection status |
| **Inventory** | `/inventory` | Manage stock, process deliveries, adjust stock levels |
| **Procurement** | `/procurement` | Manage suppliers, purchase orders, GRN |

### Login Flow

```
1. User visits /login
2. Enters Email + Password (Supabase Auth)
3. System checks:
   a. is_active === false → blocked ("Account inactive")
   b. must_change_password === true → redirect to /change-password
   c. All clear → redirect to role-specific dashboard
```

### First-Login Password Change

- Admin creates staff via **Team Management** — a random 12-char password is auto-generated
- `must_change_password = true` is set on new accounts
- On next login, user is forced to `/change-password` before accessing any page
- On success, `must_change_password = false` is set and user proceeds normally

---

## 3. Core Workflow: Order-to-Cash

This is the primary business flow — from a sales rep creating an order to cash being collected.

```
┌──────────┐    ┌────────────┐    ┌──────────────┐    ┌───────────┐    ┌────────────┐
│  Sales   │    │  Accounts  │    │  Inventory   │    │  Sales    │    │  Accounts  │
│          │    │            │    │              │    │           │    │            │
│ Create   │───►│ Review &   │───►│ Create       │    │ Record    │───►│ View       │
│ Order    │    │ Approve OR │    │ Delivery     │    │ Receipt   │    │ Collection │
│ (Pending)│    │ Reject     │    │              │    │ Entry     │    │ Status     │
└──────────┘    └────────────┘    └──────────────┘    └───────────┘    └────────────┘
     │               │                   │
  status:        status:            status:
  Pending     Approved/Rejected    In Transit
                                   → Delivered
                                   → Failed
```

### Step-by-Step

**Step 1 — Sales creates an order**

| Field | Value |
|-------|-------|
| Company | LLP / YES YES / Zekon |
| Invoice Type | GST / NGST / IGST / etc. |
| Customer | Existing (auto-fill) or New inline |
| Delivery Date | Today / Tomorrow / Custom |
| Site Order | If delivery address differs from billing |
| Products | Line items with qty · dealer price · discount% ↔ amount (bidirectional) |
| Stock check | Blocks if qty > available stock |

→ Order saved with `status = 'Pending'`

---

**Step 2 — Accounts reviews the order**

- All pending orders appear in `/accounts/pending-orders` (FIFO queue)
- Accounts can **override pricing** per line item before approving
- Two choices:

| Action | Result |
|--------|--------|
| **Approve** | `status → Approved`, approved_by + approved_at stamped, grand_total updated to approved figures |
| **Reject** | `status → Rejected`, order disappears from queue |

---

**Step 3 — Inventory creates a delivery**

- Inventory opens `/inventory/delivery` → "New Delivery"
- Selects the Approved/Billed order
- Selects **Initiated By** (staff member or "Other — enter manually")
- Selects **Delivered By** (driver from admin-managed list, or "Other — enter manually")
  - Vehicle number **auto-populates** from the selected driver record
- Delivery created with `status = 'Pending'`

Inventory then progresses delivery status:

```
Pending → In Transit → Delivered
                    └→ Failed (requires written reason)
```

---

**Step 4 — Sales records a receipt (collection)**

- Sales opens `/sales/receipt`
- Selects customer + invoice (only Approved orders appear)
- Enters received amount + payment mode (Cash / Cheque / UPI / Bank Transfer)
- For cheque: enters cheque number + cheque date
- Choose "On account of": Invoice (linked to specific order) or Advance (no order linked)
- Receipt saved with auto-generated `receipt_number = RCPT-<timestamp>`

---

**Step 5 — Accounts monitors collection**

- `/accounts/collection-status`: view all collection records by status
- `CollectionStatus`: Pending / Collected / Overdue

---

## 4. Module Workflows

---

### 4.1 Admin Module

**Path:** `/admin`

The admin role has full visibility across all modules.

#### Team Management (`/admin/staff`)

```
1. Admin clicks "Create User"
2. Fills: Full Name, Email, Role, Employee ID (optional)
3. System:
   a. Creates Supabase Auth user
   b. Inserts into users table with must_change_password = true
   c. Auto-generates a secure 12-char temp password
   d. Shows temp password in a copy-able dialog
4. New user must change password on first login
```

Staff can be **deactivated** (is_active = false) — they cannot log in while inactive. Cannot be permanently deleted.

#### Customer Management (`/admin/customers`)

```
1. Create → /admin/customers/new
   - Name, Phone, Address, GST/PAN (optional)
2. Edit → /admin/customers/:id/edit
3. Toggle Active/Inactive
```

#### Brands & Products

```
Brands (/admin/brands):
- Add brand name → is_active = true
- Toggle active/inactive

Products (/admin/products):
- Add product: Name, SKU, Brand, Dealer Price, Initial Stock Qty
- Edit pricing or toggle active
- Stock qty changes via StockAdjustment only (not editable directly)
```

#### Delivery Drivers (`/admin/drivers`)

Admin-managed list of delivery drivers used in the delivery system:

```
1. Click "Add Driver"
2. Enter: Driver Name *, Vehicle Number Plate, Phone
3. Driver appears in the "Delivered By" dropdown when creating a delivery
4. Vehicle plate auto-fills when driver is selected
5. Can Edit or Deactivate/Reactivate drivers
```

#### Admin Reports (`/admin/reports`)

- View revenue, collections, order counts aggregated across all companies
- Filter by date range / company / invoice type

#### Admin Dashboard (`/admin`)

Real-time KPIs loaded in parallel:

| KPI | Formula |
|-----|---------|
| Total Revenue | sum(grand_total) where status IN (Approved, Billed, Delivered) |
| Monthly Revenue | same, filtered to current month |
| MoM Growth | (this month − last month) / last month × 100% |
| Collected | sum(all receipts.amount) |
| Collection Rate | collected / revenue × 100% (capped at 100%) |
| Pending Orders | count where status = Pending |
| Low Stock | count where stock_qty ≤ 5 |

Charts:
- **Area chart**: Revenue vs Collections for last 6 months
- **Donut chart**: Order status distribution
- **Leaderboard**: Top 5 salespeople by this month's approved revenue
- **Low stock alert**: Products with qty ≤ 5

---

### 4.2 Sales Module

**Path:** `/sales`

#### Create Order (`/sales/create-order`)

Full flow described in [Step 1 above](#step-by-step).

Key rules:
- `Order No` auto-generated: `ORD-<base36-timestamp>-<uuid-fragment>`
- Bidirectional pricing: enter discount% → amount auto-calculates, OR enter amount → discount% back-calculates
- **Stock validation**: if qty entered > stock_qty, the item is flagged and submission is blocked
- New customers can be created inline — no need to pre-register

#### My Orders (`/sales/my-orders`)

- Shows only this salesperson's own orders
- Filter by status: Pending | Approved | Rejected | Billed | Delivered
- Read-only — no editing after submission

#### Receipt Entry (`/sales/receipt`)

Full flow described in [Step 4 above](#step-by-step).

Payment modes:

| Mode | Extra fields |
|------|-------------|
| Cash | None |
| Cheque | Cheque No. + Cheque Date required |
| UPI | None |
| Bank Transfer | None |

#### My Collection (`/sales/my-collection`)

- List of all receipts recorded by this salesperson
- Filter by payment mode
- Shows payment status badges (Received / Cleared / Credited / Bounced / Not Received)

---

### 4.3 Accounts Module

**Path:** `/accounts`

#### Order Review / Back Order (`/accounts/pending-orders`)

Full approval workflow described in [Step 2 above](#step-by-step).

Pricing override at approval:
```
Salesperson enters:   Dealer Price = 1000 | Discount = 10% | Amount = 900
Accounts can change:  Dealer Price = 950  | Discount = 5%  | Amount = 902.50
→ grand_total on order updated to sum of approved line amounts
```

#### Sales Records (`/accounts/sales`)

- All Approved / Billed / Delivered orders visible
- Shows running total of filtered records
- Filter by status
- **Rejected and Pending orders are excluded**

#### Collection Status (`/accounts/collection-status`)

- All collection records (linked to orders/receipts)
- Filter by: Pending / Collected / Overdue status

---

### 4.4 Inventory Module

**Path:** `/inventory`

#### Stock View (`/stock`) — shared across Sales, Accounts, Inventory, Admin

- Live view of all active products with current stock qty
- Stock status badges:

| Stock Qty | Badge |
|-----------|-------|
| 0 | Out of Stock (red) |
| 1–5 | Low Stock (amber) |
| 6+ | In Stock (green) |

- Filter by brand name

#### Inventory Stock (`/inventory/stock`)

- Same as Stock View but within the inventory module
- Used for detailed management reference

#### Stock Adjustment (`/inventory/adjustment`)

```
1. Select product
2. Choose type: Addition (+) or Subtraction (−)
3. Enter quantity
4. Enter reason (required)
5. Submit:
   a. Inserts into stock_adjustments (audit log)
   b. Updates products.stock_qty
   c. Validation: stock cannot go below 0
```

> ⚠️ The two writes are sequential (not in a transaction). If step b fails after step a, the audit log exists but stock is not updated.

#### Delivery Management (`/inventory/delivery`)

```
1. Click "New Delivery"
2. Select Order * (Approved or Billed orders only)
3. Select Initiated By * (staff dropdown + "Other" with manual input)
4. Select Delivered By * (driver dropdown + "Other" with manual input)
   → Vehicle number auto-fills from driver record
   → If "Other" selected: vehicle number field becomes editable
5. Save → delivery created with status: Pending

Status progression:
Pending → In Transit → Delivered ✓
                    └→ Failed (reason dialog opens, reason is recorded)
```

Admin-only: **"Manage Drivers"** button opens in-page panel to add/edit/toggle drivers.

---

### 4.5 Procurement Module

**Path:** `/procurement`

> ⚠️ **Status: UI scaffold only.** The procurement module has its UI built but is not yet connected to Supabase. All data shown is hardcoded mock data. The following describes the *intended* workflow.

#### Suppliers (`/procurement/suppliers`)

```
1. Add supplier: Name, Contact Person, Phone, Email, Address
2. Status: Active / Inactive
```

#### Purchase Orders (`/procurement/orders`) — *not yet functional*

Intended flow:
```
1. Create PO → select supplier, add line items (product + qty + price)
2. Status: Draft → Pending → Approved → Received/Cancelled
3. PO number auto-generated: PO-YYYY-NNN
```

#### GRN — Goods Receipt Note (`/procurement/grn`) — *not yet functional*

Intended flow:
```
1. Search PO number → auto-fill supplier name + expected items
2. Enter: Received Date, Delivery Challan No., Remarks
3. On submit:
   a. Create GRN record
   b. Update products.stock_qty for each received item (stock Addition)
   c. Mark PO status as Received
```

#### Purchase History (`/procurement/history`)

- View all completed purchase orders

---

## 5. Database Tables & Relationships

```
users
  └── orders.created_by ──► users.id
  └── orders.approved_by ──► users.id
  └── deliveries.initiated_by ──► users.id
  └── deliveries.created_by ──► users.id
  └── receipts.recorded_by ──► users.id
  └── stock_adjustments.adjusted_by ──► users.id

customers
  └── orders.customer_id ──► customers.id
  └── collections.customer_id ──► customers.id

brands
  └── products.brand_id ──► brands.id

products
  └── order_items.product_id ──► products.id
  └── stock_adjustments.product_id ──► products.id

orders
  └── order_items.order_id ──► orders.id
  └── receipts.order_id ──► orders.id (null for Advance)
  └── collections.order_id ──► orders.id
  └── deliveries.order_id ──► orders.id

delivery_agents
  └── deliveries.delivery_agent_id ──► delivery_agents.id

suppliers
  └── (purchase_orders.supplier_id) — not yet implemented
```

### Enums Reference

| Enum | Values |
|------|--------|
| OrderStatus | Pending · Approved · Rejected · Billed · Delivered |
| PaymentMode | Cash · Cheque · UPI · Bank Transfer |
| DeliveryStatus | Pending · In Transit · Delivered · Failed |
| CollectionStatus | Pending · Collected · Overdue |
| StockAdjustmentType | Addition · Subtraction |
| InvoiceType | GST · NGST · IGST · Delivery Challan Out · Delivery Challan In · Stock Transfer · Credit Note |
| Company | LLP · YES YES · Zekon |
| PoStatus | Draft · Pending · Approved · Received · Cancelled |
| GrnStatus | Pending · Verified · Completed |

---

## 6. Order Status Lifecycle

```
                     ┌─────────┐
       Sales creates │ PENDING │
                     └────┬────┘
                          │
              ┌───────────┴───────────┐
              │ Accounts reviews       │
              ▼                       ▼
        ┌──────────┐           ┌──────────┐
        │ APPROVED │           │ REJECTED │ (terminal)
        └────┬─────┘           └──────────┘
             │
      ┌──────┴──────┐
      │ Invoice issued│ (manual/future)
      ▼              
  ┌────────┐
  │ BILLED │
  └────┬───┘
       │
  ┌────▼──────┐
  │ DELIVERED │ (terminal — positive)
  └───────────┘
```

**Where transitions happen:**
- `Pending → Approved/Rejected`: Accounts module (`OrderReview.tsx`)
- `Approved → Billed`: Accounts Billing page (`/accounts/billing`) with invoice generation
- `Billed → Delivered`: Implied via Delivery status reaching Delivered

### 6.1 Invoice / Billing Explanation

**Billing Process**
- **Who creates invoice:** Accounts role (Admin has fallback access).
- **Where generated:** Accounts → Billing page (`/accounts/billing`).
- **What happens on billing:**
  1. User opens an `Approved` order in billing list.
  2. Clicks `Bill & PDF`.
  3. System generates invoice number in format `INV-YYYY-#####`.
  4. Order is updated to `Billed` with `invoice_number` persisted.
  5. Invoice PDF is generated and downloaded.

**GST Invoice PDF**
- PDF output includes customer details, invoice type (`GST`/`IGST`/`NGST`), item lines and total.
- Tax rows are rendered according to invoice type.

### 6.2 Forgot Password Steps

1. Login screen: user enters email and clicks `Forgot password?`.
2. System sends reset email (generic response to avoid account enumeration).
3. Cooldown prevents repeated reset-trigger spam.
4. User opens link and lands on `/change-password` recovery flow.
5. User updates password after passing password policy checks.

### 6.3 Screenshots Process

- **In-app capture:** Billing page has `Capture Screenshot` action.
- **Output:** PNG download (`billing-snapshot-YYYY-MM-DD.png`).
- **Storage convention:** keep curated artifacts in `public/screenshots/` for documentation/release notes.

---

## 7. Known Gaps & Upcoming Features

| # | Gap | Location | Impact |
|---|-----|----------|--------|
| 1 | Procurement module not connected to Supabase | `PurchaseOrders.tsx`, `GRN.tsx` | Cannot create real POs or record goods receipts |
| 2 | Order billing step missing | **Resolved**: `accounts/Billing.tsx` | Approved→Billed transition + invoice number + PDF |
| 3 | Receipt navigation broken | `ReceiptEntry.tsx` line ~200 | After saving, navigates to `/sales/-` (invalid route) |
| 4 | `payment_status` not written to DB | `ReceiptEntry.tsx` | MODE_STATUSES defined but never persisted |
| 5 | Stock Adjustment not transactional | `StockAdjustment.tsx` | Two sequential writes; no rollback if second fails |
| 6 | Order detail view missing | `MyOrders.tsx` | Row click is a stub — no order detail page |
| 7 | No rejection reason for orders | `OrderReview.tsx` | Accounts can reject but no reason is required/stored |

---

## 8. SQL Migration Reference

Run these in Supabase SQL Editor in order:

```sql
-- 1. Create delivery_agents table
CREATE TABLE IF NOT EXISTS delivery_agents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  vehicle_number  TEXT,
  phone           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. Add new columns to deliveries table
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS initiated_by      UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS initiated_by_name TEXT,
  ADD COLUMN IF NOT EXISTS delivery_agent_id UUID REFERENCES delivery_agents(id),
  ADD COLUMN IF NOT EXISTS failure_reason    TEXT;

-- 3. Add initiated_by_name (for "Other" manual entry)
-- Already covered above — included for reference

-- Auto-update updated_at trigger (apply to all tables that have it)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_delivery_agents_updated_at
  BEFORE UPDATE ON delivery_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### To regenerate TypeScript types after migrations:

```bash
supabase gen types --linked > src/app/types/database.ts
```

---

*Document auto-generated from codebase analysis · YES YES Marketing ERP · 2026*
