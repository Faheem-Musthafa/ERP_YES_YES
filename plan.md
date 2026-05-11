# Cycle-2 Remediation Plan

Created: 2026-05-12. Source: second-pass multi-agent re-audit.

Legend: `[ ]` todo · `[x]` done · `[-]` deferred (reason).

---

## P0 — Critical (closes data-leak / data-integrity / supply-chain)

- [x] **P0-1** `bill_credit_note_idempotent` cache leak fixed — auth + role check now runs before cache lookup. Live migration `bill_credit_note_idempotent_auth_before_cache`.

- [x] **P0-2** Added `.mcp.json` to `.gitignore`.

- [x] **P0-3** `RCPT-${Date.now()}` replaced with `RCPT-${crypto.randomUUID()}` fallback in ReceiptEntry.tsx:145.

- [x] **P0-4** `states_read` policy now uses `public.is_active_user()`. Helper added live (`add_is_active_user_helper`), policy updated (`states_read_use_is_active_user_retry`).

- [x] **P0-5** `create_purchase_return_idempotent` now refuses if stock would go negative or row is missing. Live migration `purchase_return_stock_underflow_guard`.

- [x] **P0-6** `delivery_items` DELETE now restricted to admin / inventory; SELECT/INSERT/UPDATE scoped to admin/inventory/accounts/sales as appropriate. Live migration `delivery_items_scope_delete_to_admin_inventory`.

- [x] **P0-7** All ungated `console.error`/`console.warn` calls in GlobalSearch, GRN, StaffManagement, Brands, ErrorBoundary now wrapped in `if (import.meta.env.DEV)`.

- [x] **P0-8** CustomerForm CSV importer hardened: UTF-8 BOM strip, MIME-type check, 5000-row cap, in-file phone de-dup, central validators (`validatePhone`/`validateGSTIN`/`validatePAN`/`validatePincode`) instead of inline regexes, NaN-safe opening-balance parser with absolute cap 1e9.

- [x] **P0-9** Subsumed by P0-1.

---

## P1 — High (data correctness + missing P2 wiring foundations)

- [-] **P1-1** Regenerate `src/app/types/database.ts` — deferred (existing `any`-casts work; full regen waits for next schema cycle).
- [-] **P1-2** CreateOrder useEffect joined-string dep — deferred (larger refactor; needs onChange-driven cross-calc).
- [x] **P1-3** OrderReview useEffect now keyed to `selectedOrder?.id` + `maxDiscountPercentage`; runs after items load. Uses `computeLineAmount` for parity with the rest of the page.
- [x] **P1-4** MyCustomers orders fetch scoped to `created_by = user.id` for sales role; row `key` swapped from `i` to `c.id`.
- [x] **P1-5** AuthContext now resolves `loading=false` on any first event via `hasResolvedLoading` latch, not only `INITIAL_SESSION`.
- [x] **P1-6** Billing date filter uses `new Date(...).toLocaleDateString('en-CA')` for local YYYY-MM-DD instead of UTC slice.
- [x] **P1-7** Billing initial fetch switched to `Promise.allSettled` with per-task error toasts.
- [x] **P1-8** Billing post-billing `setTimeout(fetchOrders, 1200)` tracked via `billRefreshTimerRef` + unmount cleanup.
- [x] **P1-9** CreditNote `fetchBillItems` now uses cancelled-flag stale-guard so a late response cannot overwrite current items.
- [x] **P1-10** ReceiptEntry `receivedAmount` routed through `sanitizeNonNegativeDecimal`.
- [x] **P1-11** AdminReports / ActivityLog / PurchaseHistory / ProcurementReports date filters: `max={todayLocalISO()}`, `min={from || undefined}` on To, plus `validateDateRange` on the report fetch.
- [x] **P1-12** ReceiptEntry chequeDate min/max bounded to ±180 days of today.
- [-] **P1-13** Customer/Supplier `state_code` select — deferred (depends on a new state-picker component used in two places; pairs with P2-7 supplier form).
- [-] **P1-14** Products HSN/tax_rate/UoM/cost_price form fields — deferred (UI redesign; pairs with P2-3 RPC tax compute).
- [-] **P1-15** Settings `low_stock_threshold` input — deferred (settings tab expansion).
- [x] **P1-16** CreditNote `orderNumber` already uses `allocate_order_number` RPC with `crypto.randomUUID()` fallback (verified existing behavior).
- [x] **P1-17** Master-data dialogs in Settings.tsx — `maxLength={LIMITS.mediumText}` added on godown / district / vehicle / edit-master inputs.
- [x] **P1-18** StaffManagement target draft routed through `sanitizeNonNegativeInteger` + max 1e8 cap.
- [x] **P1-19** Products dealer_price / stock_qty already routed through non-negative sanitizers (verified).
- [x] **P1-20** MyCollection bounceReason now uses `sanitizeMultilineText(LIMITS.reason)` + `maxLength`.
- [x] **P1-21** Dropped unused `sanitizeDecimalInput` import from CreateOrder.
- [x] **P1-22** Layout notifications skip tick if previous fetch still in-flight via `inFlight` flag.
- [x] **P1-23** CSP hardened: `object-src 'none'`, `worker-src 'self' blob:`, `img-src` narrowed to `'self' data: blob: https://*.supabase.co`.

---

## Cycle-2 follow-up sweep

- [x] **F-1** CustomerForm post-import `setTimeout(navigate, 1000)` tracked via `navTimerRef` + unmount cleanup.
- [x] **F-2** GlobalSearch focus `setTimeout(..., 100)` returned from effect for cleanup.
- [x] **F-3** CreateOrder line-amount + subtotal/totalDiscount/grandTotal now go through `decimal.js` helpers (`computeLineAmount`, `addMoney`, `mulMoney`, `pctMoney`, `roundMoney`). No more float drift on long orders.
- [x] **F-4** CreateOrder legacy-fallback hard-delete on item-insert failure replaced with `status='Voided'` so the order sequence number is not burned (matches CreditNote behaviour).
- Verified: 0 ungated `console.*` left, 0 `toISOString().split` patterns left in real code, 0 npm-audit vulns, 0 always-true policies, 0 anon-callable SECURITY DEFINER, 0 search_path mutable, 0 `parseInt` without radix, no app-side localStorage outside Supabase client.

## Rollback — removed unused P2 features

Per user direction, rolled back DB infra + dead code that had no UI consumer.

Kept (in active use):
- `invoice_sequences` + `allocate_invoice_sequence` + `allocate_order_number` + `bill_credit_note_atomic` + `bill_credit_note_idempotent` (used by CreateOrder, CreditNote, Billing).
- `orders.round_off` column (read by Billing PDF totals).
- `Voided` enum value on `order_status_enum` (used by CreateOrder + CreditNote rollback paths).
- `is_active_user()` helper (security utility for future RLS).

Dropped from live DB:
- `audit_trail` table + `audit_trail_capture()` + 7 triggers.
- `delivery_items` table + `enforce_delivery_items_cap()` + `recalc_order_item_delivered_qty()` + triggers.
- `purchase_returns` + `purchase_return_items` tables + `create_purchase_return_idempotent()` + `allocate_purchase_return_number()`.
- `states` table + FK indexes.
- Columns on `products`: `hsn_code`, `tax_rate`, `uom`, `cost_price`.
- Columns on `customers` / `suppliers`: `state_code`.
- Columns on `orders`: `place_of_supply`, `reverse_charge` (kept `round_off`).
- Columns on `order_items`: `tax_rate`, `taxable_amount`, `cgst_amount`, `sgst_amount`, `igst_amount`, `hsn_code`, `uom`, `received_qty`, `delivered_qty`, `returned_qty`.

Source files moved `docs/applied/ → docs/deprecated/`: `AUDIT_TRAIL.sql`, `DELIVERY_ITEMS.sql`, `PURCHASE_RETURNS.sql`, `P2_TAX_SCHEMA_EXTENSIONS.sql`.

Code dropped from `src/`:
- `src/app/hooks/useAbortableEffect.ts` (never imported).
- `validation.ts`: `validateIFSC`, `validateGSTSlab`, `validateMoneyAmount`, `validatePhoneLoose` (never called).
- `utils.ts`: `fmtDashboard` (never imported).

## P2 — Removed from plan

All P2 items struck from the plan since the supporting DB infra has been
rolled back. If/when the business decides to ship per-line GST tax,
purchase returns, partial deliveries, etc., the relevant SQL files are
preserved in `docs/deprecated/` for re-application.

---

## Verification (run after each P0/P1 batch)

```
npm run typecheck
npm run validate:migrations
npm run test
npm run build
```

Then commit. Push only after manual smoke of CN flow + receipt creation.
