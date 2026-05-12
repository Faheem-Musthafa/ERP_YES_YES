# ERP Business-Logic Audit

**Generated:** 2026-05-12
**Scope:** Full audit of `src/app/**` for business-logic errors. Style/typing nits excluded.
**Method:** 4 parallel domain investigators (Sales, Accounts, Inventory+Procurement, Auth+Admin+Core) reading each page in depth.
**Severity legend:** **critical** = data loss / silent money error / multi-user race · **high** = wrong numbers, scope leaks, integrity gap · **medium** = correctness edge case · **low** = UX / cosmetic correctness.

Total findings: **229**.

---

## Table of contents

1. [Cross-cutting themes](#1-cross-cutting-themes)
2. [Sales module](#2-sales-module)
3. [Accounts + admin-finance](#3-accounts--admin-finance)
4. [Inventory + procurement](#4-inventory--procurement)
5. [Auth + admin-config + core](#5-auth--admin-config--core)
6. [Suggested fix order](#6-suggested-fix-order)

---

## 1. Cross-cutting themes

These recur across modules. Fix once, fix everywhere.

| Theme | Where it bites | Canonical fix |
|---|---|---|
| **Outstanding-formula divergence** | `Payments.tsx`, `CustomerAnalysisReport.tsx`, `MyCustomers.tsx`, `ReceiptEntry.tsx`, `get_customer_balance` RPC | Frontend counts `Approved`; RPC counts only `Billed+Delivered`. Pick one filter set, align all 4 layers + `docs/OUTSTANDING_LOGIC.md`. |
| **Unbounded queries** | Billing, OrderReview, SalesRecords, AdminReports, accounts/Dashboard, admin/Dashboard, CustomerAnalysisReport, ProcurementDashboard, GlobalSearch | Every list query without `.range()` or `.limit()` is a memory bomb at scale. Push aggregation to RPCs/SQL views. |
| **Timezone drift** | `accounts/Dashboard.tsx:33`, `admin/Dashboard.tsx:140`, `sales/Dashboard.tsx:34`, `MyOrders.tsx:64`, `PurchaseHistory.tsx:59`, `MyCollection.tsx:267`, multiple | `new Date(d).toLocaleDateString()` and `.toISOString()` on local Date drop IST users into the previous UTC day. Always go through `dates.ts` helpers. |
| **No idempotency on writes** | CreateOrder, CreditNote, ReceiptEntry, GRN, Delivery | Network-retry produces dup orders/receipts/GRNs. Use server-allocated sequences + client-supplied request_id. |
| **Sales-role scope leak** | MyCustomers history dialog, ReceiptEntry, GlobalSearch, CollectionStatus | List-view filters by `created_by` but drill-downs / search / receipt-entry do not. Relies entirely on RLS. |
| **Status state-machine missing** | MyCollection, CollectionStatus, DeliveryManagement, OrderReview | Free state transitions in any direction. Cleared cheque → Not Collected silently reverses customer credit. |
| **Denormalised stock columns** | `products.stock_qty` vs `product_stock_locations.stock_qty` | Two sources of truth — Brands.tsx reads the stale one. Drop the denormalised column or sync via trigger. |
| **Low-stock threshold scattered** | `InventoryStock`, `Products`, `InventoryReports`, `StockAdjustment`, `StockManagement`, `stockHealth` | Hardcoded `<= 5` in 6 places + no UI for `low_stock_threshold` setting that already exists. Centralise. |
| **Master-data referential integrity** | Settings.tsx delete/rename of Godown/district/vehicle | Deletes referenced master rows; orphans `customers.location`, stock_locations. Cascade-update via RPC. |
| **`dealer_price ≥ 0` allows zero** | Products, CreateOrder, StockManagement, Brands | Products created with ₹0 dealer price → "Stock Value" KPI silently zeros. Use `validatePositiveAmount`. |
| **`localStorage` recovery / audit dropped silently** | recovery.ts:22-39 | Loose regex matches mistake RLS denial for "missing table"; audit row silently dropped. Match by error code. |

---

## 2. Sales module

### `src/app/pages/sales/CreateOrder.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| CreateOrder.tsx:271-272 | **critical** | Stock check is client-side against a page-load snapshot — two reps double-allocate the same units. No reservation. | Move stock check into `create_order` RPC with `SELECT ... FOR UPDATE` (or `UPDATE ... WHERE stock_qty >= p_qty` rowcount check). |
| CreateOrder.tsx:309-363 | **critical** | Legacy fallback runs when RPC reply lost → second order created. No idempotency key. | Pass client-side idempotency token (UUID); RPC returns existing order on dup token. |
| CreateOrder.tsx:341, 336 | high | UUID fallback `ORD-${randomUUID()}` produces non-sequential order/invoice numbers — fails GSTR-1 sequential numbering. | Hard-fail submit when allocator RPC missing; surface config error. |
| CreateOrder.tsx:248-256 | high | Grand-total sums free-text `i.amount`, but discount/subtotal derive from `dp×qty×disc`. Three displayed numbers inconsistent; persisted total can diverge. | Always derive grand_total = subtotal − totalDiscount; recompute `amount` from disc% before save. |
| CreateOrder.tsx:303-305 | high | `dealer_price ≥ 0` lets zero-price lines through; zero-amount orders persist. | Use `validatePositiveAmount`; reject zero-amount lines. |
| CreateOrder.tsx:309-319 | high | `p_created_by` trusted from client; spoofed via DevTools. | Resolve `created_by = auth.uid()` inside the RPC; ignore the param. |
| CreateOrder.tsx:228-231, 215, 229 | medium | `clampDiscountInput` silently caps at `maxDiscountPercentage` — user typing 50% with max 20% gets 20% without a toast → undercharging unnoticed. | Reject + toast; don't silently clamp. |
| CreateOrder.tsx:351-354 | medium | Legacy fallback persists `amount` from free-text input — bypasses recompute. | Recompute server-side from `dp,qty,discount_pct`. |
| CreateOrder.tsx:258-262 | medium | `customDate` only `min={todayLocalISO()}` — JS-disabled client can submit past date. | Server-side validate; reject in RPC. |
| CreateOrder.tsx:347 | medium | Legacy fallback persists status `'Pending'`; RPC path may differ → divergence. | Share exact status logic, or remove fallback. |
| CreateOrder.tsx:189 | low | `String(Date.now())` as React key — fast Add clicks collide. | Use `crypto.randomUUID()`. |
| CreateOrder.tsx:74-162 | low | useEffect fetch without cancel flag; stale data races into state on navigate. | Add `cancelled` ref pattern. |
| CreateOrder.tsx:314 | low | `site_address=''` for `isSiteOrder='no'` indistinguishable from blank. | Pass `null`. |

### `src/app/pages/sales/MyOrders.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| MyOrders.tsx:31-36 | medium | Sales-scope only via client `eq('created_by', user.id)`. Relies on RLS. | Belt-and-suspenders: enforce in RLS policy for sales role too. |
| MyOrders.tsx:64, 138 | medium | `new Date(date).toLocaleDateString()` on DATE column → UTC drift, off-by-one IST. | Use `formatDateIN` / `parseLocalDate`. |
| MyOrders.tsx:101 | medium | No `Voided` filter despite status existing. Empty/`all` sentinel mixed. | Add Voided option; pick one sentinel. |
| MyOrders.tsx:48 | low | `o.order_number.toLowerCase()` throws on null (legacy rows). | `(o.order_number ?? '').toLowerCase()`. |

### `src/app/pages/sales/MyCustomers.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| MyCustomers.tsx:91-97 | **critical** | Revenue tally has **no order-status filter** — counts Pending/Advance/Voided as revenue. Diverges from Payments/Dashboard. | `.in('status', ['Approved','Billed','Delivered'])`. |
| MyCustomers.tsx:182-194 | high | Customer-history drill-down has NO sales-role scope. Sales user opens any customer and sees all orders/receipts. | Scope orders/receipts by `created_by` for sales role. |
| MyCustomers.tsx:202-210 | high | "Bills" = `status='billed' OR 'delivered' OR has invoice_number` — voided orders that retain `invoice_number` get counted. CN orders also slip in. | Exclude `status='Voided'` AND `invoice_type='Credit Note'`. |
| MyCustomers.tsx:107-110 | high | Revenue sum doesn't filter CN-typed orders; negative CN grand_totals skew tally. | Add `invoice_type` filter and use money helpers. |
| MyCustomers.tsx:585-632 | high | Opening Balance card displays `invoiceOb + dcOb` AND reads `opening_balance` (generated); manual SQL writes can drift the two. | Read only generated column for headline; only source columns for tree. |
| MyCustomers.tsx:646, 662 | medium | "Billed Amount" sums include CN-typed rows with negative totals → double-count reversal sign. | Filter CN/Voided before summing. |
| MyCustomers.tsx:255, 264 | medium | `toLocaleDateString('en-IN')` on timestamps OK; CSV may mis-render. | Use `formatDateIN` consistently. |
| MyCustomers.tsx:280-328 | low | Export uses `paginated` for list but full `customerOrders` for history — inconsistent scope. | Pick one; document. |

### `src/app/pages/sales/MyCollection.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| MyCollection.tsx:108-119 | **critical** | No state-machine. Cleared cheque → Not Collected silently reverses customer ledger credit. No audit. | Server RPC `update_receipt_status` enforces one-way transitions; reversal only via Void path. |
| MyCollection.tsx:99-122 | **critical** | Status update on Select-change with no confirmation. One mis-click flips Bounced → Cleared, instantly crediting customer. | Confirm dialog for Cleared/Credited; require reason for downgrades. |
| MyCollection.tsx:108-111 | high | Updating to non-Bounced wipes `bounce_reason` — losing audit history when toggling back. | Keep history in separate audit table; never blank in-row. |
| MyCollection.tsx:78-83 | high | Filter shows receipts for voided/cancelled orders without warning — receipts still affect outstanding. | Cross-check `orders.status`; visually flag or auto-void. |
| MyCollection.tsx:73-92 | medium | No validation that receipt amount ≤ order grand_total minus prior receipts; over-collection accepted. | Validate before submit. |
| MyCollection.tsx:267 | medium | UTC date-parse rendering. | `formatDateIN`. |
| MyCollection.tsx:148-156 | medium | `r.receipt_number.toLowerCase()` crashes on null. | `(r.receipt_number ?? '')`. |

### `src/app/pages/sales/CollectionStatus.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| CollectionStatus.tsx:103-115 | **critical** | Same state-machine gap as MyCollection, AND missing `recorded_by` scope — anyone with route access can change any receipt. | Enforce role check; route via RPC with transition validation. |
| CollectionStatus.tsx:117-131 | **critical** | `confirmBounce` has no scope — any user can bounce any receipt. | RPC + actor permission check. |
| CollectionStatus.tsx:72-82 | high | Lists all receipts org-wide; sales user can mark another rep's cheque Bounced. | Restrict route to accounts/admin at router level. |
| CollectionStatus.tsx:111, 126 | high | Status change not audited — no `last_status_changed_by/_at`. | Add audit columns / table. |
| CollectionStatus.tsx:257 | medium | UTC date-parse. | `formatDateIN`. |
| CollectionStatus.tsx:85 | low | useEffect not async-safe — setState on unmounted. | Add cancellation flag. |

### `src/app/pages/sales/CreditNote.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| CreditNote.tsx:361-403 | **critical** | CN does NOT restock returned items — customer credited but stock unchanged. | Call `create_credit_note` RPC that adjusts `product_stock_locations` atomically. |
| CreditNote.tsx:388-395 | **critical** | order_items inserted with `quantity=1` always, regardless of units returned. Per-unit price/amount conflated. Inventory & GST reports mis-report. | Let user pick return qty; persist `qty × unit_amount`. |
| CreditNote.tsx:298-310 | high | Per-row max check, but no aggregate check across prior CNs for the same bill — user can issue 4 full-bill CNs and invert ledger. | Sum prior non-voided CNs; validate `remaining ≥ 0`. |
| CreditNote.tsx:328-339 | high | UUID fallback for CN numbers violates GSTR-1 sequential numbering. | Hard-fail without allocator RPC. |
| CreditNote.tsx:312-319 | high | Non-GST CN: `resolvedProductId` = first item with matching brand (arbitrary). Multiple items same brand → wrong line debited. | User picks specific bill item, or persist brand link not fake product_id. |
| CreditNote.tsx:377 | high | GST CN sets `taxable_amount = signedNoteAmount` but `cgst/sgst/igst = 0` — overstates GST liability. | Reverse tax components based on original bill breakdown. |
| CreditNote.tsx:67 | high | `normalizeAmount = Math.abs(...)` strips sign; downstream sign-aware reader can double-flip. | Don't strip the sign; flip only at display. |
| CreditNote.tsx:115 | medium | Bills filter excludes `Approved` (which Payments counts) — customer with Approved order can't have CN raised. | Align canonical status set with Payments. |
| CreditNote.tsx:340-356 | low | CN type / against-bill / brand stored in `;`-joined remarks — not queryable. | Add structured columns. |

### `src/app/pages/sales/ReceiptEntry.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| ReceiptEntry.tsx:148, 152-166 | **critical** | Receipt number `RCPT-${randomUUID()}` — no server allocator. Reconciliation/audit cannot rely on order. | Add `allocate_receipt_number` RPC. |
| ReceiptEntry.tsx:152-167 | **critical** | Insert not idempotent — double-tap / slow-network retry creates duplicate receipts crediting customer twice. | Idempotency token + unique constraint on `request_id`. |
| ReceiptEntry.tsx:74-79 | **critical** | Approved-orders dropdown filters only `status='Billed'`. Common "Approved-but-not-billed advance receipt" use case impossible. Layer-mismatch with Payments. | Decide canonical link-eligible statuses; align with Payments. |
| ReceiptEntry.tsx:152-166 | high | No validation `amount ≤ order remaining` when `on_account_of='Invoice'`. User can pay 5× the bill against one invoice. | Validate against grand_total − collected. |
| ReceiptEntry.tsx:74-89 | high | Bills query has NO sales-role scope — sales user records receipts against any customer. | Add `created_by` scope. |
| ReceiptEntry.tsx:154-165 | high | New-customer + receipt flow not atomic — receipt insert fail leaves orphan customer. | Transactional RPC. |
| ReceiptEntry.tsx:124, 427 | medium | Cheque date ±180 days; RBI invalidates >90 days. | Tighten to ±90. |
| ReceiptEntry.tsx:158 | medium | `payment_status` defaults to `Not Collected` even for Cash — Cash is "Received" immediately. | For Cash, default `Received`. |
| ReceiptEntry.tsx:138-143 | low | New-customer create doesn't dedupe by phone. | Pre-insert phone-uniqueness check. |

### `src/app/pages/sales/Dashboard.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| Dashboard.tsx:34-35 | **critical** | `new Date(year, month, 1).toISOString()` → UTC; first 5h30m of month-1 IST excluded; early-AM-IST orders on day-1 mis-bucketed. | Use `localDateToUTCDayRange` / dates.ts helpers. |
| Dashboard.tsx:59-60 | high | Revenue includes CN-typed orders (negative `grand_total`) — distorts target progress. | Filter `invoice_type !== 'Credit Note'`. |
| Dashboard.tsx:45-48 | high | `allMyOrders` limited to 50 — Total Sales sums only those 50. | Server-side sum RPC. |
| Dashboard.tsx:47-48 | high | Collected receipts don't filter linked-order status — Cleared receipts on Voided orders count. | Join orders; exclude voided-attached. |
| Dashboard.tsx:63-67 | medium | Week bucketing 1-7/8-14/15-21/22-end gives W4 = 10 days for 31-day months. | Bucket by ISO week-of-month or split cleanly. |
| Dashboard.tsx:78-79 | medium | Float-sum drift on receipt amounts. | `addMoney`/`toNumber`. |
| Dashboard.tsx:91 | medium | `targetPct` capped at 100 — overshoot hidden. | Show true %, cap only on ring visual. |
| Dashboard.tsx:46 | low | `myMonthOrders` count includes Voided. | Filter out Voided. |

---

## 3. Accounts + admin-finance

### `src/app/pages/accounts/Billing.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| Billing.tsx:281-309 | **critical** | CN-invoice fallback computes `MAX(suffix)+1` over `.ilike()` capped at 5000 — concurrent CN issuances collide on same `${base}NNNN`. | Fail closed without RPC, or `INSERT ON CONFLICT` retry loop with unique index. |
| Billing.tsx:1076-1091 | **critical** | CN fallback updates `orders` with precomputed invoice_number and `status='Approved'` guard but no transactional sequence — two operators within the 1.2 s refresh window both succeed. | Drop fallback once `bill_credit_note_idempotent` is required, or unique-constraint retry. |
| Billing.tsx:1018-1035 | high | `validateDateRange`/`localRangeToUTC` imported but never invoked — date filter is pure client-side; server returns all Approved/Billed. | Push date bounds into Supabase query. |
| Billing.tsx:939-968 | high | `fetchOrders` no pagination — full Approved+Billed history every mount. | `.range()` + lazy load on filter. |
| Billing.tsx:728-746 | high | `effRate` infers GST slab from rounding; zero-taxable lines lose slab label; lines with no `gst_rate` column become unlabeled. | Persist `gst_rate` per line or compute at item level. |
| Billing.tsx:441-463 | medium | `numberToWordsIndian` paise rounding can yield `100` ("and 100 Paise"). | Carry over: paise=100 → rupees+1. |
| Billing.tsx:744 | medium | `round_off` only rendered when `typeof === 'number'`; old rows print without the rounding line yet math implicitly rounds. | Default null → 0; reconcile `subtotal+tax+round_off === grand_total`. |
| Billing.tsx:46, 54 | medium | Money fields typed non-nullable but DB allows null → `null !== 0` is true → "₹ NaN" prints. | `?? 0` everywhere before arithmetic; tighten types. |
| Billing.tsx:1129-1147 | medium | Backup persist on line 1129 stomps `billed_at/billed_by` to current user when RPC succeeded silently. | Add `.eq('billed_by', null)` guard, or drop fallback. |
| Billing.tsx:1281-1305 | medium | Admin password verified against anon client; no rate limit; password traverses wire even on cancel. | Server-side per-user rate limit; RPC re-checks role. |
| Billing.tsx:1024 | medium | `toLocaleDateString('en-CA')` non-deterministic on older Safari. | `todayLocalISO(new Date(d))`. |
| Billing.tsx:228-234 | low | `getCompanySeriesCode` falls back to `'00'` for unknown companies — silent collision. | Throw on unknown / pull from `company_profiles`. |
| Billing.tsx:1437 | low | `grand_total.toLocaleString('en-IN')` no 2dp — `1234.5` prints `1,234.5`. | Use `fmt()`. |

### `src/app/pages/accounts/OrderReview.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| OrderReview.tsx:142-145 | high | Discount validator rejects `> 100` but UI cap is `maxDiscountPercentage` (e.g. 60); server still receives up to 100. | Compare against `maxDiscountPercentage`. |
| OrderReview.tsx:169-198 | high | Fallback updates items+order in separate statements — mid-loop failure leaves partial pricing on still-Pending order. | Single RPC; never multi-row writes without transaction. |
| OrderReview.tsx:186-195 | high | Fallback approve has no `.eq('status','Pending')` — double-approval succeeds; second click overwrites approval metadata. | Add status guard; check rowcount > 0. |
| OrderReview.tsx:206-227 | medium | `handleReject` fallback lacks status guard — already-Approved order can be flipped to Advance. | Add guard. |
| OrderReview.tsx:52-59 | medium | Pending query swallows `error`; network failure shows empty list. | Surface via toast. |
| OrderReview.tsx:54-61 | medium | Pending queue: no LIMIT, no scope. | `.range()`. |
| OrderReview.tsx:144 | low | `> 100` allows 100% discount → free order, no "are you sure" prompt. | Cap at policy max. |

### `src/app/pages/accounts/Payments.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| Payments.tsx:72, 114, 167 | high | Documented divergence — frontend counts `Approved`, RPC `get_customer_balance` counts only `Billed+Delivered`. Same customer = different "Net Balance" on different pages. | Drop `'Approved'` from line 72 to match RPC (or change the RPC), update `CustomerAnalysisReport.tsx:84` together. |
| Payments.tsx:84-94 | high | Date range applied to both `orders.created_at` AND `receipts.created_at` — March order paid in April is excluded from billed but included in paid → outstanding goes negative. | Don't filter receipts by created_at, or filter only at display layer. |
| Payments.tsx:165-168 | high | `entry.totalPaid = receiptsByCustomer.get(...) ?? entry.totalPaid` overwrites order-scoped paid with **all** customer receipts — order-loop accumulator discarded. | Pick semantic, remove the other accumulation; document. |
| Payments.tsx:139-163 | medium | Inactive customers excluded from select, but their order_id rows still aggregated through stub with `customerName='Unknown'`. | Pre-load all customers or drop their order data fully. |
| Payments.tsx:134, 160 | medium | `outstanding` initialised to `opening_balance` then overwritten unconditionally. Dead code. | Drop initial assignment. |
| Payments.tsx:130-135 | low | Mixed inactive-customer semantics (excluded from list, included via stub). | Unify. |

### `src/app/pages/accounts/SalesRecords.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| SalesRecords.tsx:23-34 | high | No date filter, no pagination — fetches every Approved/Billed/Delivered order ever. | Server pagination + date filter; min `.limit(1000)`. |
| SalesRecords.tsx:53 | medium | `total` sums `grand_total ?? 0` across statuses; transitioning order counted twice during status change window. | Distinct order IDs; pick latest status. |
| SalesRecords.tsx:42-48 | medium | Client search throws on null `order_number`. | `?? ''`. |
| SalesRecords.tsx:91-101 | medium | Empty-string + `'all'` sentinel mix → mount-fires reset effect. | Initialise to `'all'`. |
| SalesRecords.tsx:64, 136 | low | `toLocaleDateString()` browser-locale → MM/DD/YYYY in en-US. | `formatDateIN`. |

### `src/app/pages/accounts/Dashboard.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| Dashboard.tsx:33-35 | high | Local-now → `.toISOString()` for `today/monthStart`; late-evening IST users undercount today. | dates.ts helpers. |
| Dashboard.tsx:46-49 | high | Recent/month/today receipt queries with no LIMIT. | `.limit()` or date window only. |
| Dashboard.tsx:59-60 | medium | `pending/approved` counts derived from first 100 orders only — misleading button counts. | Separate `count: 'exact'` query. |
| Dashboard.tsx:67 | medium | `pendingValue` summed over 100-record slice. | Separate aggregate. |
| Dashboard.tsx:55-58 | medium | `payment_status.is.null,payment_status.neq.Voided` OR-filter redundant with `isCollectedReceiptStatus`. | Drop OR filter. |

### `src/app/pages/admin/CustomerAnalysisReport.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| CustomerAnalysisReport.tsx:84, 117 | high | Includes `Approved` — same divergence as Payments. | Align with RPC. |
| CustomerAnalysisReport.tsx:71-75 | high | Orders query has no filter — pulls every order ever; status filter is client-side. | Server filter + date scope. |
| CustomerAnalysisReport.tsx:65-67 | high | Customers query lacks `is_active=true` — soft-deleted customers inflate `totalCustomers`. Inconsistent with Payments. | Add active filter. |
| CustomerAnalysisReport.tsx:186-205 | medium | Export uses `paginated` instead of `filtered` — operators get only one page. | Export `filtered`. |
| CustomerAnalysisReport.tsx:154-155 | medium | `collectionRate = Math.min(...,100)` hides advances (overpayment). | Don't clamp; show >100% explicitly. |
| CustomerAnalysisReport.tsx:148-152 | medium | `locationData` chart recomputes on every keystroke in search box → district pie reshuffles live. | Use unfiltered data for charts. |
| CustomerAnalysisReport.tsx:537-541 | low | Net-Balance row coloring uses `>0` / `<0`; KPI card uses `>=0`. Inconsistent. | Pick one threshold (recommend `> 0` everywhere). |

### `src/app/pages/admin/AdminReports.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| AdminReports.tsx:130-155, 158-188, 191-215 | high | Revenue/Staff/Customer reports load every order ever (no LIMIT) and aggregate in JS — memory bomb at 50k+. | SQL views / RPCs. |
| AdminReports.tsx:141-150 | high | Month bucket key from `toLocaleString` is unsorted; rows display newest→oldest from query order. | Sort `Object.values(months)` by Date. |
| AdminReports.tsx:158-188 | high | `totalOrders` includes Pending+Advance; `avgOrderValue = revenue / approved`. Label "Avg Order Value" misleads. | Relabel or compute against totalOrders. |
| AdminReports.tsx:97-127 | medium | Nested `.gte('orders.created_at',...)` returns rows with `orders: null`; line 247 renders `new Date(null).toLocaleDateString()` → "Invalid Date". | `!inner` filter + null guard. |
| AdminReports.tsx:140-150 | medium | Months without orders are missing from table — trend gaps. | Pre-seed buckets. |
| AdminReports.tsx:191-215 | medium | String-compare `created_at` works only because ISO Z-normalised — fragile. | `new Date()` compare. |
| AdminReports.tsx:489 | medium | Customer rows keyed `c.name + i` — duplicate names collide on key. | Key by `customer.id`. |
| AdminReports.tsx:264-269 | low | Staff CSV exports raw numbers; UI uses `fmt`. | Use `fmt`. |

### `src/app/pages/admin/ActivityLog.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| ActivityLog.tsx:63-85 | high | Activity log scans only most-recent 200 orders / 100 adjustments / 100 deliveries / 150 recovery — "last month" filter returns empty because events were dropped at query layer. | Push category + date filter into Supabase. |
| ActivityLog.tsx:179-202 | high | Date filter mixes ISO UTC `e.timestamp` with local Date object from `parseLocalDate`. Off-by-one on DST boundaries. | `localRangeToUTC`. |
| ActivityLog.tsx:108 | medium | "Order Created" prints current `grand_total` (after approval price adjustments), not creation snapshot. | Snapshot at creation OR label "Current Value". |
| ActivityLog.tsx:112-122 | medium | Pivots on `o.status` not events — pending→approved→reject loses the approve event. Audit lossy. | `order_status_history` table. |
| ActivityLog.tsx:139-148 | medium | Delivery events emit only "Delivery Created" — dispatch/delivered transitions missing. | Emit events on non-null transitions. |
| ActivityLog.tsx:150-162 | medium | Recovery events silently dropped on RLS failure. | Surface error at least to console. |
| ActivityLog.tsx:23, 32 | low | Category enum missing billing / user role changes / receipts. | Add categories. |
| ActivityLog.tsx:107, 118, 132 | low | `performedBy` falls back `'Unknown'` for soft-deleted users — no indicator. | Snapshot name, or label "Deleted user". |
| ActivityLog.tsx:152 | low | `replace(/^\w/, ...)` converts `soft_delete` → `Soft_delete`. | Replace underscores; title-case all words. |

### `src/app/pages/admin/Dashboard.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| Dashboard.tsx:241 | high | `totalCustomers: customers?.length ?? 0` reads array length while query is `{ count: 'exact' }`. Caps at 1000. | Read response `count`. |
| Dashboard.tsx:140-144 | high | `monthStart/prevMonth/chartStart` built local then `.toISOString()` → UTC drift IST evenings. | dates.ts helpers. |
| Dashboard.tsx:149-150, 171 | high | Orders/receipts unlimited for "All" range. | `.limit()` or DB aggregation. |
| Dashboard.tsx:179-186 | medium | Documented Approved-vs-Billed divergence. | Align with RPC. |
| Dashboard.tsx:253-255 | medium | `revenueGrowth` returns null when prev=0; "Evaluating baseline..." hides legitimate "+∞%" / "+100%". | Explicit New / +100%. |
| Dashboard.tsx:257-259 | medium | `Math.min(...,100)` hides over-collection (advance). | Don't clamp. |
| Dashboard.tsx:197-208 | medium | `chartMonths` for `7d/30d` ranges = 1 → chart shows single bar instead of time series. | Daily granularity for short ranges. |
| Dashboard.tsx:204-208 | medium | `if (monthBuckets[key])` guard silently drops out-of-window rows. | Log dropped rows DEV. |
| Dashboard.tsx:212-220 | medium | `salesByUser` includes only `role='sales'`; misses sales_manager or any role that creates orders. | Include all order-creating roles. |
| Dashboard.tsx:373, 387 | low | Tailwind dynamic class strings `bg-${kpi.accent}-500` get tree-shaken. | Static map. |

---

## 4. Inventory + procurement

### `src/app/pages/procurement/GRN.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| GRN.tsx:69-72 | **critical** | Over-receipt check uses PO total only; cumulative receipts across multiple GRNs not tracked — full qty receivable twice. | `remaining = po_line_qty − SUM(grn_items.received_qty)` per line; validate per line. |
| GRN.tsx:80-93 | **critical** | Proportional distribution: `Math.floor` + top-up loop can leave `assignedQty < requestedQty` silently. | Exact accounting (last line gets remainder); assert sum equals requested. |
| GRN.tsx:101 | high | Idempotency key omits `remarks`/distribution; two genuine same-day partial receipts collide. | Hash full payload + nonce. |
| GRN.tsx:163-164 | high | Pending POs query only `Pending` + `Approved` — partially received POs may vanish despite owing stock. | Filter by remaining qty > 0. |
| GRN.tsx:106 | high | RPC receives `supplier_id` from client-cached PO — admin re-pointing PO mid-flow records old supplier. | Resolve supplier_id server-side from po_id. |
| GRN.tsx:130-136 | medium | `received_date` updated client-side AFTER RPC — race window. | Pass into RPC; persist atomically. |
| GRN.tsx:286 | medium | `validateDateNotInFuture` imported but never called; only HTML `max` attr. | Call in submit guard. |
| GRN.tsx:46 | medium | `receivedDate` initialised once via `todayLocalISO()`; saves yesterday's date if page kept open past midnight. | Refresh on submit if untouched. |

### `src/app/pages/inventory/StockAdjustment.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| StockAdjustment.tsx:154-157 | high | Subtraction gated only by `confirm()`; no client check `qty ≤ currentLocationStock` — relies on RPC. | Pre-RPC validation. |
| StockAdjustment.tsx:52 | medium | Recent adjustments fetched without godown/company filter — cross-company leak. | Add filter; RLS check; show location column. |
| StockAdjustment.tsx:163 | medium | Sign convention split between client (positive qty + type flag) and DB — if DB ever inverts, UI mis-renders. | Normalise at one layer + unit test. |
| StockAdjustment.tsx:147-148 | medium | Sanitiser strips `.` so pasted `1.5` becomes `15` silently. | Reject non-integer numerics. |
| StockAdjustment.tsx:258 | low | Preview clamps to 0 but RPC may throw — user gets confusing error. | Explicit "Insufficient stock" message. |

### `src/app/pages/inventory/StockTransfer.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| StockTransfer.tsx:184-187 | high | Client-side `qty > fromStock` against cached snapshot — race possible. | RPC `UPDATE … WHERE stock_qty >= p_quantity` + rowcount check. |
| StockTransfer.tsx:217 | medium | No reversal handle — operator must do an inverse manual transfer (2 audit rows, obscured intent). | "Reverse Transfer" RPC linking the original. |
| StockTransfer.tsx:91-101 | medium | When < 2 godowns available, `defaultTo` falls back to `defaultFrom`; only equality check at 179 saves. | Disable form + explicit warning. |
| StockTransfer.tsx:232-236 | medium | `swapLocations` uses non-functional setState — stale reads under React batching. | Functional updates or single state object. |
| StockTransfer.tsx:41 | low | `company` defaults to hardcoded `'LLP'` — Select shows empty if missing from list. | Default to `COMPANY_LIST[0]`. |

### `src/app/pages/inventory/Products.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| Products.tsx:117-118 | high | `dealer_price ≥ 0` allows zero; downstream Stock Value KPIs silently ₹0. | `validatePositiveAmount`. |
| Products.tsx:125, 143 | high | Writes `products.stock_qty` denormalized AND seeds `product_stock_locations` — two sources of truth. Brands.tsx reads the stale one. | Drop the denormalized column, or sync via trigger. |
| Products.tsx:150-153 | high | Seeds all initial qty at `Godowns[0]` — no user choice; reordering Godowns changes default. | Let user pick seed location. |
| Products.tsx:159-161 | high | Compensating delete on stock-seed failure is best-effort; if delete fails, orphan product `is_active=true` with no stock rows. | Atomic create+seed RPC. |
| Products.tsx:128-131 | high | No SKU uniqueness pre-check; conflict shows raw PG error. | Catch 23505 → friendly message. |
| Products.tsx:341 | medium | `max=10000000` is UI-only cap; paste bypasses. | `validateMaxAmount` numeric. |
| Products.tsx:87-92 | medium | `live_stock_qty` aggregates ALL location rows including orphan locations no longer configured. | Sum only configured Godowns or clean orphans on settings save. |

### `src/app/pages/inventory/Brands.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| Brands.tsx:60 | high | Stock value = `dealer_price × products.stock_qty` (denormalized) — wrong after any adjustment/transfer/GRN. | Aggregate from `product_stock_locations.stock_qty`. |
| Brands.tsx:90 | high | Brand rename allows case-insensitive duplicates — "Sony" / "sony" coexist. | Case-insensitive uniqueness check. |
| Brands.tsx:46-48 | medium | Excludes archived products from value — silent understate when archiving stocked product. | Sum stock regardless of `is_active`, or warn on archive. |
| Brands.tsx:139-140 | low | KPI cards compute over `filtered`, mislabelled as totals. | Use full dataset or relabel. |

### `src/app/pages/inventory/InventoryStock.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| InventoryStock.tsx:82-85 | high | Total stock sums only `nextLocationOptions` — orphan-location rows hidden though stock exists in DB. Silent stock loss. | Sum all rows; show "Unconfigured location" bucket. |
| InventoryStock.tsx:125, 138 | medium | Low-stock `<= 5` hardcoded; appears in 6+ files; no per-product reorder point. | Centralise via settings; per-product override. |
| InventoryStock.tsx:217 | low | `toLocaleString()` no decimals; mixed precision elsewhere. | Use `money.ts` formatters. |

### `src/app/stockHealth.ts` / `src/app/pages/inventory/InventoryDashboard.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| stockHealth.ts:80-83 | high | `lowStockCount` includes 0-stock; `outOfStockCount` is a subset. KPI cards show both → double-counting risk in aggregates. | Decouple: lowStockCount = totalStock>0 && ≤threshold. |
| stockHealth.ts:65 | medium | Aggregates over ALL rows (legacy locations included); StockManagement uses only configured Godowns → pages disagree. | Unify scope. |
| InventoryDashboard.tsx:29-32 | medium | "In Stock" excludes both low and out-of-stock; `totalProducts ≠ inStock+lowStock+outOfStock` because outOfStock ⊂ lowStock. | Rename label OR exclude outOfStock from lowStockCount. |

### `src/app/pages/inventory/InventoryReports.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| InventoryReports.tsx:44 | medium | `lowStock` `> 0 && ≤ 5`; conflicts with stockHealth's `≤ 5` (includes 0). | Unify via stockHealth helper. |
| InventoryReports.tsx:30 | medium | Recent adjustments fetched system-wide — cross-company leak. | Add company/godown filter. |
| InventoryReports.tsx:106 | low | `StatusBadge status='Approved'` for additions, `'Advance'` for subtractions — wrong semantics. | Neutral labels. |

### `src/app/pages/inventory/DeliveryManagement.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| DeliveryManagement.tsx:144-148 | high | Same order can be selected for multiple deliveries — duplicates possible since idempotency key includes initiator/driver/vehicle. | Unique constraint on `order_id` for active delivery; key on `order_id` alone. |
| DeliveryManagement.tsx:217-251 | high | No state-machine; `Delivered → Pending` allowed client-side — risk of double-deduction or never-reverted stock. | Enforce transitions server-side. |
| DeliveryManagement.tsx:418-426 | high | Status dropdown enabled for all roles — non-driver sales user can mark "Delivered" and trigger stock deduction. | Role-gate (admin/dispatcher); read-only otherwise. |
| DeliveryManagement.tsx:194 | medium | Idempotency key includes initiator-text verbatim — typo defeats dedup. | Normalise / hash. |
| DeliveryManagement.tsx:149 | medium | Staff list unfiltered by role — cross-role leak in initiator dropdown. | Filter relevant roles. |
| DeliveryManagement.tsx:316 | medium | Inactive drivers excluded from new-delivery dropdown but historic deliveries show no indicator. | Annotate inactive in history. |

### `src/app/pages/procurement/PurchaseOrders.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| PurchaseOrders.tsx:32 | high | No supplier/status/company filter — every logged-in user sees every PO across companies; confidentiality leak. | Company filter + RLS. |
| PurchaseOrders.tsx:96 | low | Status mapping `'Approved' → 'In Transit'` is UI fiction; Partial/Received/Cancelled rendered inconsistently. | Shared status mapper across PO views. |
| PurchaseOrders.tsx:92 | low | "Items" column sums `quantity` (units) but label suggests row count. | Label "Total Qty". |

### `src/app/pages/procurement/PurchaseHistory.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| PurchaseHistory.tsx:59-66 | medium | "This month" key from `toISOString()` (UTC) — IST orders around month boundary mis-bucket. | `todayLocalISO().slice(0,7)`. |
| PurchaseHistory.tsx:51-53 | medium | `created_at` (UTC ISO) compared as plain string to local YYYY-MM-DD — late-night IST POs land in next-day filter. | Convert via local slice. |
| PurchaseHistory.tsx:41 | medium | Filters `status='Received'` only — partial-receive POs hidden. | Include Partial + show received fraction. |
| PurchaseHistory.tsx:62-65 | low | Avg-delivery-days falls to 0 for null `delivered_at` — skews average. | Filter null rows out of avg. |

### `src/app/pages/procurement/ProcurementReports.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| ProcurementReports.tsx:101 | medium | `totalSpend` sums all statuses incl. Draft/Cancelled — overstates spend. | Exclude Draft+Cancelled. |
| ProcurementReports.tsx:82-92 | medium | Date filter only on `created_at`; no `delivered_at` filter for receipt-based KPI. | Use `delivered_at` for receipts. |
| ProcurementReports.tsx:113-114 | low | Supplier perf counts orders not units; ignores partial deliveries / value. | Aggregate by GRN totals. |

### `src/app/pages/procurement/Suppliers.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| Suppliers.tsx:46 | high | "Add Supplier" button has no handler — silently does nothing. | Wire handler or remove. |
| Suppliers.tsx:25-28 | medium | No GSTIN/PAN/address fields in client types; helpers `validateGSTIN`/`validatePAN` exist but unused. | Add gst_pan, pan_no, address; validate. |
| Suppliers.tsx:104 | medium | Order count includes Cancelled/Draft POs. | Filter to active statuses. |

### `src/app/pages/procurement/ProcurementDashboard.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| ProcurementDashboard.tsx:43-44 | high | POs limited to last 100; "Active/Completed/This-month" KPIs all derived from truncated slice. Wrong totals at scale. | Server-side count queries per status. |
| ProcurementDashboard.tsx:73-76 | medium | `pendingGRNs` scans only 100 most recent GRNs → undercount. | Per-status SQL count. |

### `src/app/pages/shared/StockManagement.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| StockManagement.tsx:165 | medium | "Stock Value" uses `dealer_price` (cost-side ambiguity) × stock — mis-named for selling-price valuation. | Rename to "Inventory at Dealer Price" or use costing model. |
| StockManagement.tsx:163-166 | low | `Number(p.dealer_price) || 0` allows 0 silently — same root as Products bug. | Reject 0. |

---

## 5. Auth + admin-config + core

### `src/app/contexts/AuthContext.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| AuthContext.tsx:176 | high | `supabase.auth.signOut()` defaults to global scope — kills every tab/device on every logout. | `signOut({ scope: 'local' })` unless full revoke is intentional. |
| AuthContext.tsx:174-181 | high | Deactivated user's existing tab keeps valid session — only checked on navigation. | Periodic `refreshProfile()` on focus; force-logout if `is_active=false`. |
| AuthContext.tsx:40-73 | medium | `fetchUserProfile` returns null on any RLS/DB error indistinguishable from "deleted user" — silent logout loops on transient errors. | Differentiate missing-row vs transient; retry transient. |
| AuthContext.tsx:151-157 | medium | `refreshProfile` swallows errors silently. | Log and reset user, or rethrow. |
| AuthContext.tsx:30-32 | low | `isInvalidRefreshTokenError` matches free-text error message — Supabase changes phrasing across releases. | Match by error code if available. |

### `src/app/App.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| App.tsx:78, 89, 100 | high | Deactivated user bounced to `/login` but Login auto-redirects back to `/` if session still valid → redirect loop / flicker. | Call `logout()` before redirect when `is_active=false`. |
| App.tsx:120 | medium | `/login` redirects to `/` even when Supabase recovery hash is present — recovery flow hijacked. | Also check `hash.includes('type=recovery')`. |
| App.tsx:84-94 | medium | `ChangePasswordRoute` admits anyone with `must_change_password=false` if hash contains `access_token=` (covers normal sign-in too). | Use `PASSWORD_RECOVERY` event or strictly require `type=recovery`. |

### `src/app/pages/Login.tsx` / `ChangePassword.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| ChangePassword.tsx:52-65 | high | If `users.update({must_change_password:false})` fails after `auth.updateUser` success, user is bounced back forever. | Roll back or display error; retry the flag update via RPC/trigger. |
| ChangePassword.tsx:57-61 | medium | Recovery-flow user blocked from `users` row by RLS gets "profile error" toast after password already set → locked out. | Verify users row exists; treat profile update as best-effort. |
| Login.tsx:25-29 | low | `loadCompanyProfiles()` runs anon; falls through to defaults silently if RLS denies. | Public SECURITY DEFINER RPC; hide UI until loaded. |
| Login.tsx:117 | low | `sanitizeEmail` runs on every keystroke — pastes mid-edit lose cursor position. | On blur. |

### `src/app/pages/admin/StaffManagement.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| StaffManagement.tsx:289-305 | high | `handleDeleteStaff` blocks admin role check but does NOT prevent archiving last active admin → org locked out of admin. | Count active admins; block if archive leaves zero. |
| StaffManagement.tsx:505-521 | high | Role-change Select has no client check for self-demotion; admin can demote themselves last admin → org lockout. | Disable for current user; block last-admin demotion. |
| StaffManagement.tsx:369 | high | `must_change_password: true` update result not checked — silent failure leaves reset password not forced. | Capture error; surface toast; retry. |
| StaffManagement.tsx:325-330 | medium | `employee_id` updated with no uniqueness check. | Uniqueness check or DB constraint. |
| StaffManagement.tsx:390-415 | medium | Target rounded silently with no explicit upper bound — paste bypasses UI `max=100000000`. | Validate against explicit cap; reject if exceeded. |
| StaffManagement.tsx:417-421 | low | Search filter doesn't trim — leading spaces break matches. | `search.trim().toLowerCase()`. |
| StaffManagement.tsx:230-245 | low | Pre-flight client admin check is informational; relies on edge-fn for actual enforcement. | Keep as UI hint only; rely on server. |

### `src/app/pages/admin/Settings.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| Settings.tsx:319-327 | high | `saveMasterListFallback` overwrites entire master list — concurrent admin edits silently lose data (last-write-wins). | Row-level CRUD via RPC; optimistic-locking version check. |
| Settings.tsx:372-405 | high | Delete master option (Godown/district/vehicle) has no referential check — orphans `customers.location`, stock_locations. | Pre-check usage count; block delete. |
| Settings.tsx:414-463 | high | Rename master option only updates settings list; existing referencing rows keep old value. | RPC cascade-update; warn user. |
| Settings.tsx:255-294 | medium | Business settings written sequentially without transaction — partial failure leaves DB partial. | Single atomic RPC. |
| Settings.tsx:255-261 | medium | `financial_year_start/end` have no validation — can be equal or out of 1-12. | Validate 1-12, start ≠ end. |
| Settings.tsx (whole) | medium | No UI for `low_stock_threshold` though `settings.ts` reads the key. | Add UI in Business Rules tab. |
| Settings.tsx:465-541 | medium | "YES YES" profile writes legacy keys sequentially — partial write possible. | Same RPC/transaction. |
| Settings.tsx:144-157 | medium | Master-data UI persists instantly via RPC but the "Save Business" button claims to save them too — confusing UX. | Remove master-data from save button. |
| Settings.tsx:602-617 | low | `sanitizeText` on keystroke collapses multi-line silently. | Sanitize on blur. |

### `src/app/pages/admin/DeliveryDrivers.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| DeliveryDrivers.tsx:162-169 | high | `toggleActive` has no client role check — any signed-in user if RLS allows. | Add role check (admin/inventory). |
| DeliveryDrivers.tsx:113-128 | medium | Custom master-list vehicle types collapsed into 'Others' + `vehicle_type_other` — loses fidelity. | Store custom values directly. |

### `src/app/pages/admin/Customers.tsx` / `CustomerForm.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| CustomerForm.tsx:321 | high | Bulk CSV `.insert(toInsert)` sends thousands of rows in one body — exceeds PostgREST 1 MB limit; large CSVs fail. | Chunk inserts (e.g., 500 per batch); roll up errors. |
| CustomerForm.tsx:69-112 | high | Phone uniqueness not client-checked; relies on DB constraint; conflict surfaces as generic "Failed to save". | Pre-check; surface 23505 as friendly toast. |
| CustomerForm.tsx:392, 396 | high | Place + District marked `*` (required) in UI but never validated in `handleSubmit` — saves with empty / null. | Add `validateRequired`. |
| CustomerForm.tsx:223-225 | medium | `parseOpeningBalance` returns null when value > 1e9; caller treats null as 0 → silently zeroes huge balances. | Treat over-cap as error; mark row skipped. |
| CustomerForm.tsx:251-254 | medium | Within-file dedup ignores malformed phones — "invalid" and "dup" lumped into skip count without distinction. | Distinguish in skip reason. |
| CustomerForm.tsx:296-319 | medium | CSV brand auto-create doesn't run names through `sanitizeText` — raw control chars land in `brands.name`. | Sanitize before insert. |
| Customers.tsx:80-89 | medium | Lists ALL customers (active+archived); no `is_active` default, no DB pagination. | Default `is_active=true`; "Show archived" toggle; paginate at DB. |
| Customers.tsx:140-150 | medium | `fetchCustomerHistory` uses `.limit(150)` — silently truncates, no "more" indicator. | "Load more" or page; show truncation. |
| Customers.tsx:161-166 | low | Bill detection counts `status='delivered'` even without invoice_number. | Use `invoice_number != null` only. |
| CustomerForm.tsx:190 | low | `findIndex('District','district','location')` — 'District' candidate unreachable because headers lowercased. | Drop dead candidate. |
| CustomerForm.tsx:336-339 | low | Post-import `setTimeout(navigate, 1000)` fires even after user closes modal. | Navigate after toast confirmation. |

### `src/app/components/GlobalSearch.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| GlobalSearch.tsx:104-122 | high | Sales user gets results for ALL customers — relies entirely on RLS. | Scope by role for sales (`assigned_to`). |
| GlobalSearch.tsx:146-164 | medium | Order search returns global orders regardless of role. | Scope by `created_by` for sales. |
| GlobalSearch.tsx:118,139,160,184,208 | medium | All result paths point to admin routes; sales/accounts navigation no-op (ProtectedRoute bounces). | Route per role. |
| GlobalSearch.tsx:107 | medium | `%${safe}%` interpolation: confirm PostgREST honors `escapePostgrestLike` backslash escapes across server versions. | Verify; pre-encode. |

### `src/app/components/Layout.tsx` / `Sidebar.tsx` / `ErrorBoundary.tsx`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| Layout.tsx:62-66 | medium | `loadStockHealthSummary` + Supabase counts fire for ALL roles every 60 s incl. procurement (which doesn't show stock notif). | Skip per-role for non-relevant queries. |
| Layout.tsx:129-131 | low | Polling never pauses on `document.hidden` — background tabs keep polling. | Pause on visibilitychange. |
| Layout.tsx:35 | low | `today` computed at mount; stale across midnight. | Daily timer / focus recompute. |
| Layout.tsx:66 | medium | `todayLocalISO()` inlined into `.or()` — pattern works (helper returns ISO date) but brittle if any callsite ever takes user input. | Use parametric `.lt()`. |
| Sidebar.tsx:188-191 | medium | Sidebar fetches `companyProfiles` independently of Layout/Login — 3 independent fetches per page. | Hoist to context / cache. |
| Sidebar.tsx:177-194 | low | `openSections` initialised once; role change post-mount mis-syncs. | Re-init on `user.role` change. |
| ErrorBoundary.tsx:24-26 | medium | `componentDidCatch` only logs in DEV — prod crashes silently swallowed. | Send to error-reporting endpoint. |
| ErrorBoundary.tsx:14-72 | medium | No reset action — refresh loses unsaved autosave state. | "Try Again" → `setState({hasError:false})`. |

### `src/app/recovery.ts` / `validation.ts` / `dates.ts` / `settings.ts` / `companyProfiles.ts`

| File:line | Sev | Bug | Fix |
|---|---|---|---|
| recovery.ts:22-33 | medium | `isMissingRecoveryColumnError` matches generic word "column" — any column-related error triggers fallback that strips `deleted_at/by`, losing audit metadata. | Tighten match to specific column names. |
| recovery.ts:35-39 | medium | `isMissingRecoveryEventsTableError` loose regex matches "relation"/"could not find" — RLS-denied insert masquerades as missing table; audit silently dropped. | Match by PG code `42P01` only. |
| recovery.ts:115, 144 | low | Archive/restore call `logRecoveryEvent` AFTER table update — event-log failure leaves state changed but audit missing. | DB trigger or atomic RPC. |
| recovery.ts:41-59 | low | `getRecoveryActor` does extra `users` SELECT per operation. | Cache per session. |
| validation.ts:115-120 | medium | `validatePhone` regex is Indian-mobile-only (10 digits starting 6-9); CSV doc claims "7-15 digits optional +". | Align doc with regex. |
| validation.ts:134-143 | medium | GSTIN state-code regex caps at 01-37; rejects Ladakh (38) and OIDAR/non-resident (96/97/99). | Expand allowed codes. |
| validation.ts:170-177 | low | `validatePasswordStrength` counts trailing spaces toward length. | Trim or disallow whitespace edges. |
| validation.ts:99-103 | low | `validateRequired` throws TypeError on undefined. | `String(value ?? '').trim()`. |
| dates.ts:34-42 | medium | `localDateToUTCDayRange` correct for TIMESTAMPTZ but wrong for DATE columns (UTC ISO drops time → off-by-one east of UTC). | Use plain `YYYY-MM-DD` ranges for DATE columns. |
| dates.ts:82-87 | low | `isFutureDate` fails on trailing whitespace. | Trim before parse. |
| dates.ts:98-109 | low | `validateDateRange` returns silently if either bound missing. | Require both or accept explicit option. |
| settings.ts:264-300 | medium | `loadSettingsMap` 3-layer fallback silently swallows failures. | Surface error when all three fail. |
| settings.ts:81-94 | low | `readTargetMap` drops non-numeric entries silently. | Log dropped in DEV. |
| companyProfiles.ts:98-103 | medium | RPC + settings table errors both swallowed → defaults returned silently. | `console.warn` DEV; expose loading state. |
| companyProfiles.ts:62-63 | low | `getPrimaryCompanyName` hard-coded `'YES YES'`. | Make configurable via settings. |

---

## 6. Suggested fix order

Two principles: stop money/data bleeding first, then close scope leaks, then everything else.

### Tier 0 — stop the bleeding (do this week)

1. **Credit Note stock restock** — `CreditNote.tsx:361-403` and `:388-395`. Inventory currently silently wrong on every CN.
2. **Receipt status state-machine + auth** — `MyCollection.tsx:108-119`, `CollectionStatus.tsx:103-131`. One mis-click rewrites customer ledger silently.
3. **GRN cumulative-receipt accounting** — `GRN.tsx:69-72, 80-93`. Allows over-receipt; double-counts stock.
4. **Idempotency on Receipt + Order + GRN** — `ReceiptEntry.tsx:152-167`, `CreateOrder.tsx:309-363`, `GRN.tsx:101`. Duplicate writes credit customers / dispatch stock twice.
5. **Receipt allocator** — `ReceiptEntry.tsx:148` (no `RCPT-${randomUUID()}` in production accounting).
6. **`MyCustomers` missing status filter** — `:91-97`. Revenue counts Voided/Advance/Pending.
7. **Sales-role scope leaks** — `MyCustomers.tsx:182-194`, `ReceiptEntry.tsx:74-89`, `CollectionStatus.tsx:72-82`, `GlobalSearch.tsx:104-164`.

### Tier 1 — correctness drift (this sprint)

8. **Outstanding-formula alignment** — Approved vs Billed+Delivered in `Payments.tsx`, `CustomerAnalysisReport.tsx`, `Sales/Dashboard.tsx`, `get_customer_balance`, `CreditNote.tsx:115`. Pick one and align all five layers + `docs/OUTSTANDING_LOGIC.md`.
9. **Last-admin guard** — `StaffManagement.tsx:289-305, 505-521`. Org lockout risk.
10. **Master-data referential integrity** — `Settings.tsx:372-405, 414-463`. Deletes/renames orphan customer/stock rows.
11. **Stock denormalisation** — `Products.tsx:125, 143`, `Brands.tsx:60`. Drop `products.stock_qty` or sync via trigger.
12. **Date filter UTC drift** — `accounts/Dashboard.tsx:33`, `admin/Dashboard.tsx:140`, `sales/Dashboard.tsx:34`, `PurchaseHistory.tsx:59`, `MyOrders.tsx:64`, `MyCollection.tsx:267`.
13. **Unbounded queries** — `Billing.tsx:939`, `AdminReports.tsx` (whole), `SalesRecords.tsx:23-34`, `CustomerAnalysisReport.tsx:71-75`, `ProcurementDashboard.tsx:43-44`. Use SQL views / `.range()`.
14. **Delivery status state-machine + role gate** — `DeliveryManagement.tsx:217-251, 418-426`.
15. **`dealer_price > 0` everywhere** — `Products.tsx:117`, `StockManagement.tsx:163`.

### Tier 2 — gaps + cosmetics (next sprint)

16. CN aggregate guard, GSTIN/PAN on suppliers, Customer bulk-CSV chunking, `low_stock_threshold` settings UI, AuthContext `signOut({ scope: 'local' })`, deactivated-user force-logout, ErrorBoundary reset, all remaining medium/low rows above.

---

## Verification once fixes land

```bash
npm run typecheck
npm run validate:migrations
npm run test
npm run build
```

Then manual smoke:

1. Two-tab race: open same product on two browsers; transfer/sell simultaneously → stock can't go negative.
2. Bulk CSV import of 6000 rows → chunked inserts; errors per chunk.
3. CN flow: issue CN against Billed order → stock replenished, customer credited, qty reflects actual return.
4. Receipt double-click on slow network → only one receipt persisted.
5. Sales user login → cannot see another rep's customers via search, customer drill-down, or receipt-entry dropdowns.
6. Cleared cheque → trying to revert to "Not Collected" requires admin + reason; audit log row written.
7. Admin tries to demote themselves when they're the only admin → blocked.
8. Settings → delete a Godown still referenced by stock → blocked with usage count.
9. Outstanding for AAK Mall: `Payments.tsx` value matches `get_customer_balance(...)` return value.
