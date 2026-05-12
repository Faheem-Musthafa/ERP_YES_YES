# Outstanding / Customer Balance Logic

This document explains how a customer's **outstanding amount** is computed across the ERP, end-to-end: which columns feed it, which order and receipt states count, where each computation lives, and the known divergences between layers.

Last updated: 2026-05-12 (after the `opening_balance → opening_invoice + opening_delivery_challan` split).

---

## 1. The core formula

```
outstanding = opening_balance
            + Σ orders.grand_total       (only certain statuses — see §3)
            − Σ receipts.amount          (only collected statuses    — see §4)
```

Where `customers.opening_balance` is now a **STORED generated column**:

```
opening_balance = opening_invoice + opening_delivery_challan
```

So whatever code reads `opening_balance` (frontend rows, RPCs, exports) automatically gets the sum of the two new buckets — no caller needed to change when we split the column.

### Sign convention

| Outstanding | Meaning | UI status |
|-------------|---------|-----------|
| `> 0`       | Customer owes us money | **Outstanding** (`Pending` badge) |
| `= 0`       | Fully settled | **Settled** (`Completed` badge) |
| `< 0`       | We owe the customer (advance / overpayment) | **Advance** (`Advance`-styled badge) |

Source: `src/app/pages/accounts/Payments.tsx:198–210`.

---

## 2. Where it lives

### Frontend (TypeScript / React)

| File | Line | What it computes |
|------|------|------------------|
| `src/app/pages/accounts/Payments.tsx` | 167 | `outstanding = openingBalance + totalBilled − totalPaid` per customer; primary "Payments Tracker" view |
| `src/app/pages/admin/CustomerAnalysisReport.tsx` | 117 | `outstanding = opening_balance + orderInfo.revenue − totalCollected` |
| `src/app/pages/admin/Customers.tsx` | 512–558 | Displays opening balance with **Invoice / Delivery Challan** tree breakdown in the per-customer history dialog |
| `src/app/pages/sales/MyCustomers.tsx` | ~600 | Same tree breakdown, sales-scoped view (only own orders count) |
| `src/app/pages/admin/CustomerForm.tsx` | 465+ | Edits the two source columns (`opening_invoice`, `opening_delivery_challan`) — wrapped in a parent "Opening Balance" tree group |

### Database (Postgres, `supabase` project `ruwkgubpowdshpucmqxc`)

| Object | What it does |
|--------|--------------|
| `customers.opening_invoice` | `numeric NOT NULL DEFAULT 0` — invoice-document opening balance |
| `customers.opening_delivery_challan` | `numeric NOT NULL DEFAULT 0` — DC-document opening balance |
| `customers.opening_balance` | `numeric GENERATED ALWAYS AS (opening_invoice + opening_delivery_challan) STORED` |
| `public.get_customer_balance(uuid)` | RPC; same formula as §1, stricter order filter (see §3) |
| `public.get_customer_ledger(uuid)` | RPC; returns chronological debit/credit rows (orders + receipts) using the same filters |
| `public.create_customer(...)` | RPC; legacy `p_opening_balance` param now routes into `opening_invoice` (`opening_balance` is generated and rejects direct writes) |

Authoritative schema dump: `docs/reference/A_TO_Z_SCHEMA_FROM_SUPABASE_2026_04_16.sql`.

---

## 3. Order filtering — which orders count?

```
+----------------------+--------------------------------+
| Caller               | Order statuses included        |
+----------------------+--------------------------------+
| Payments.tsx (UI)    | Approved, Billed, Delivered    |
| CustomerAnalysis…tsx | Approved, Billed, Delivered    |
| get_customer_balance | Billed, Delivered  (stricter)  |
| get_customer_ledger  | Billed, Delivered              |
+----------------------+--------------------------------+
```

This is the **single most important divergence in the system**: a customer whose pipeline holds Approved-but-not-yet-Billed orders will look like they owe more on the frontend than the DB RPC reports. This was already true before the column split and was not introduced by it.

`grand_total` itself is computed in `create_order()`:

```
subtotal       = Σ qty × dealer_price (per order line)
total_discount = subtotal × discount_pct / 100
grand_total    = subtotal − total_discount
```

Voided / reversed orders are flipped out of contention because their status no longer matches the inclusion set.

---

## 4. Receipt filtering — which receipts count as paid?

```ts
// src/app/utils.ts
export const RECEIPT_COLLECTED_STATUSES = ['Received', 'Credited', 'Cleared'] as const;
export const VOIDED_RECEIPT_STATUS       = 'Voided' as const;
export const isCollectedReceiptStatus = (status) =>
    RECEIPT_COLLECTED_STATUSES.includes(status);
```

| Receipt `payment_status` | Counted as paid? |
|--------------------------|------------------|
| `Received` (Cash / UPI)  | ✅ |
| `Credited` (Bank Transfer) | ✅ |
| `Cleared` (Cheque)       | ✅ |
| `Not Collected` (default) | ❌ |
| `Not Received` (Cash)    | ❌ |
| `Bounced` (Cheque)       | ❌ |
| `Voided`                 | ❌ (also dropped at query layer) |
| `null`                   | ❌ |

Per-mode source of the collected statuses (`RECEIPT_STATUS_OPTIONS_BY_MODE`):

| Payment mode  | Default                | Other allowed                 |
|---------------|------------------------|-------------------------------|
| Cash          | Not Collected          | Received, Not Received        |
| Cheque        | Not Collected          | Cleared, Bounced              |
| Bank Transfer | Not Collected          | Credited                      |
| UPI           | Not Collected          | Received                      |

The `Payments.tsx` query also adds `or('payment_status.is.null,payment_status.neq.Voided')` to drop voided receipts at the network layer, and **then** narrows the in-memory aggregate with `isCollectedReceiptStatus`.

---

## 5. End-to-end example

Customer **AAK Mall**:

| Field | Value |
|-------|-------|
| `opening_invoice` | ₹ 12,000 |
| `opening_delivery_challan` | ₹ 3,500 |
| `opening_balance` (generated) | ₹ 15,500 |

Orders for AAK Mall:
- Order A: status `Billed`, grand_total ₹ 8,000
- Order B: status `Delivered`, grand_total ₹ 5,000
- Order C: status `Approved` (not yet billed), grand_total ₹ 2,000

Receipts:
- Receipt 1: order A, ₹ 8,000, status `Cleared` ✅
- Receipt 2: order B, ₹ 2,000, status `Voided` ❌
- Receipt 3: order B, ₹ 2,500, status `Received` ✅

**DB RPC `get_customer_balance`** (Billed + Delivered only, collected receipts only):
```
15,500 + (8,000 + 5,000) − (8,000 + 2,500) = 18,000
```

**Frontend `Payments.tsx`** (Approved also counted):
```
15,500 + (8,000 + 5,000 + 2,000) − (8,000 + 2,500) = 20,000
```

The ₹ 2,000 gap is Order C. Once it transitions to Billed/Delivered the two layers converge.

---

## 6. Where the *split* matters

Because `opening_balance` is generated:

- **Reads** are unchanged. Anything that previously selected `opening_balance` still works and now silently sees the sum of invoice + DC opening.
- **Writes** must target `opening_invoice` / `opening_delivery_challan`. Inserts or updates that target `opening_balance` directly will be Advance by Postgres (`column "opening_balance" can only be updated to DEFAULT`).
- The legacy `create_customer(p_opening_balance, ...)` RPC keeps its old signature; the value now lands in `opening_invoice` so existing scripts continue to work without dropping balances on the floor.
- The CSV bulk-import path (`CustomerForm.tsx` → `handleCSVUpload`) accepts two new columns (`Invoice`, `Delivery Challan`) and still parses a legacy `Opening Balance` column for backward-compat — it maps to `opening_invoice` when the new columns are absent.

---

## 7. Verification recipes

### From SQL

```sql
-- Spot-check a customer
SELECT id, opening_invoice, opening_delivery_challan, opening_balance
FROM   customers
WHERE  id = '<uuid>';

-- Compare DB RPC with hand math
SELECT public.get_customer_balance('<uuid>') AS db_outstanding;

-- Ledger view (chronological debits / credits)
SELECT * FROM public.get_customer_ledger('<uuid>');
```

### From the UI

1. Open Admin → Customers → click a customer row.
2. The dialog header shows 5 summary cards; the first is **Opening Balance** with a tree:
   ```
   ├─ Invoice            ₹ X
   └─ Delivery Challan   ₹ Y
   ```
3. Edit the customer (pencil icon) → Financial & Tax Binding → "Opening Balance" group:
   - Enter Invoice and Delivery Challan separately.
   - Live total above the tree updates as you type.
4. Save → reopen the dialog → tree should reflect the new split. The Payments page row for the same customer should pick up the delta in `Net Balance` because `opening_balance` (generated) increased by the same amount.

### From a fresh CSV import

Header row examples (case-insensitive, punctuation stripped before matching):

```
Company,Brand,Customer Name,Place,District,pincode,GSTIN,PAN No,Address,Phone,Invoice,Delivery Challan
```

or legacy:

```
…,Address,Phone,Opening Balance
```

The legacy column lands fully in `opening_invoice`; the new columns split per row.

---

## 8. Known divergences / gotchas

- **Approved orders**: counted by the frontend, ignored by the DB RPC. Choose deliberately when reporting numbers externally — pick one and stick to it.
- **Generated column performance**: `opening_balance` is `STORED`, so writes touch both source columns and the generated column on disk. This is fine at our row volume but worth noting if the table grows by orders of magnitude.
- **Sign mixing**: a customer can be `Outstanding` on invoice and `Advance` on DC simultaneously (or vice-versa). The summary card shows the net only; the tree shows each leg with its own colour, so users can see when buckets are pointing in opposite directions.
- **CSV silent fallback**: an import with neither `Invoice` nor `Delivery Challan` columns but a legacy `Opening Balance` column will route everything to `opening_invoice`. Users expecting the import to also populate DC must add the explicit column.

---

## 9. Files to touch when this changes again

If the formula needs to change (e.g. exclude a receipt status, add a new order status, introduce another opening bucket), update **all** of these together:

- `src/app/pages/accounts/Payments.tsx` (lines ~71, 92, 114, 167)
- `src/app/pages/admin/CustomerAnalysisReport.tsx` (lines ~67, 116–117)
- `src/app/utils.ts` (`RECEIPT_COLLECTED_STATUSES`, `isCollectedReceiptStatus`)
- DB function `public.get_customer_balance` (apply via Supabase migration)
- DB function `public.get_customer_ledger` (same)
- This document.

Keeping the frontend filter set and the RPC filter set in deliberate sync prevents the divergence in §3 from drifting further.
