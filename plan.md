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

- [ ] **P1-1** Regenerate `src/app/types/database.ts` from live schema so new P2 columns (`state_code`, `hsn_code`, `tax_rate`, `uom`, `cost_price`, `place_of_supply`, `round_off`, `reverse_charge`, per-line tax cols) are typed.
  - File: `src/app/types/database.ts`.

- [ ] **P1-2** Fix CreateOrder useEffect joined-string dep — move cross-calc into onChange handlers, drop the reconcile effect.
  - File: `src/app/pages/sales/CreateOrder.tsx:228-240`.

- [ ] **P1-3** OrderReview `useEffect([])` on items — dead code; remove or replace with a setter inside `selectOrder`.
  - File: `src/app/pages/accounts/OrderReview.tsx:111-130`.

- [ ] **P1-4** MyCustomers — scope orders fetch to `created_by = user.id`; replace `key={i}` with `key={c.id}`.
  - File: `src/app/pages/sales/MyCustomers.tsx:88-92, 474`.

- [ ] **P1-5** AuthContext — set `loading=false` on any first event, not only `INITIAL_SESSION`.
  - File: `src/app/contexts/AuthContext.tsx:112-138`.

- [ ] **P1-6** Billing date filter — replace `approved_at?.slice(0,10)` (UTC) with `parseLocalDate` + local YYYY-MM-DD compare.
  - File: `src/app/pages/accounts/Billing.tsx:1004-1012`.

- [ ] **P1-7** Billing — `Promise.all` → `Promise.allSettled` so partial failures don't leave stale state.
  - File: `src/app/pages/accounts/Billing.tsx:986`.

- [ ] **P1-8** Billing — track and clear `setTimeout(fetchOrders, 1200)` on unmount.
  - File: `src/app/pages/accounts/Billing.tsx:1151`.

- [ ] **P1-9** CreditNote — `fetchBillItems` stale-response guard (capture-active-id pattern or AbortController).
  - File: `src/app/pages/sales/CreditNote.tsx:144-177`.

- [ ] **P1-10** ReceiptEntry — `setReceivedAmount(sanitizeNonNegativeDecimal(...))`.
  - File: `src/app/pages/sales/ReceiptEntry.tsx:252`.

- [ ] **P1-11** Date-filter pages — add `max={todayLocalISO()}` + `validateDateRange` on AdminReports / ActivityLog / PurchaseHistory / ProcurementReports.
  - Files: `src/app/pages/admin/AdminReports.tsx:312-315`, `src/app/pages/admin/ActivityLog.tsx:258-267`, `src/app/pages/procurement/PurchaseHistory.tsx:105-108`, `src/app/pages/procurement/ProcurementReports.tsx:195-198`.

- [ ] **P1-12** ReceiptEntry chequeDate min/max bounds — accept ±180 days of today.
  - File: `src/app/pages/sales/ReceiptEntry.tsx:424`.

- [ ] **P1-13** Customer / Supplier — add `state_code` select bound to `public.states`.
  - Files: `src/app/pages/admin/CustomerForm.tsx`, `src/app/pages/procurement/Suppliers.tsx` (form does not yet exist — see P2).

- [ ] **P1-14** Products form — add `hsn_code`, `tax_rate`, `uom`, `cost_price` inputs; persist on insert/update.
  - File: `src/app/pages/inventory/Products.tsx:57+`.

- [ ] **P1-15** Settings — add low_stock_threshold number input.
  - File: `src/app/pages/admin/Settings.tsx`.

- [ ] **P1-16** CreditNote — replace timestamp-based `orderNumber` JS fallback with `crypto.randomUUID()` (allocator deferred).
  - File: `src/app/pages/sales/CreditNote.tsx:314` (UUID fallback path already added; verify and tighten).

- [ ] **P1-17** Master-data dialogs in Settings.tsx — add `maxLength` on the 4 unrestricted inputs.
  - File: `src/app/pages/admin/Settings.tsx:1039, 1072, 1105, 1138`.

- [ ] **P1-18** StaffManagement target draft — route through `sanitizeNonNegativeInteger`.
  - File: `src/app/pages/admin/StaffManagement.tsx:538`.

- [ ] **P1-19** Products form — switch `Number(form.dealer_price || 0)` to use `sanitizeNonNegativeDecimal` in onChange (P1.5 partial revisit).
  - File: `src/app/pages/inventory/Products.tsx:117-118`.

- [ ] **P1-20** MyCollection bounceReason — wrap through `sanitizeMultilineText(LIMITS.reason)` + `maxLength`.
  - File: `src/app/pages/sales/MyCollection.tsx:295`.

- [ ] **P1-21** Drop unused `sanitizeDecimalInput` import from CreateOrder.
  - File: `src/app/pages/sales/CreateOrder.tsx:18`.

- [ ] **P1-22** Layout notifications — skip tick if previous fetch still in-flight.
  - File: `src/app/components/Layout.tsx:122-125`.

- [ ] **P1-23** CSP — add `object-src 'none'`, `worker-src 'self' blob:`.
  - File: `vercel.json:24`.

---

## P2 — Bigger redesign (deferred unless fast-track requested)

- [-] **P2-1** State-derived GST classification (remove Invoice Type dropdown, derive from `customers.state_code` vs company state).  Reason: needs UX decision + RPC change.
- [-] **P2-2** New `create_credit_note_idempotent` RPC with per-line tax mirror + Sales Return stock-in.  Reason: large RPC + UI redesign.
- [-] **P2-3** Extend `create_order` RPC to compute and persist per-line CGST/SGST/IGST.  Reason: RPC rewrite.
- [-] **P2-4** Extend `approve_order_atomic` to recompute tax on price edits.  Reason: RPC rewrite.
- [-] **P2-5** GRN per-line received-qty UI (replace proportional distribution).  Reason: page redesign.
- [-] **P2-6** PurchaseReturns frontend page + route + sidebar entry.  Reason: new page.
- [-] **P2-7** Suppliers create / edit form.  Reason: new page.
- [-] **P2-8** PurchaseOrders create form.  Reason: new page.
- [-] **P2-9** Move temporary-password generation from StaffManagement to `invite-user` edge function.  Reason: cross-repo (edge function lives in Supabase functions repo).
- [-] **P2-10** Migrate Supabase JWT storage off localStorage to httpOnly cookies.  Reason: needs auth-proxy edge function.
- [-] **P2-11** Sidebar — add procurement nav group.  Reason: UX decision.
- [-] **P2-12** Round-off computation on invoice finalization.  Reason: depends on P2-3 tax compute.
- [-] **P2-13** `audit_trail` PII redaction (`pan_no`, `gst_pan`).  Reason: needs business sign-off.
- [-] **P2-14** Replace `createCreditNoteInvoiceNumber` fallback in Billing.tsx with hard fail once P2-2 RPC ships.  Reason: depends on P2-2.

---

## Verification (run after each P0/P1 batch)

```
npm run typecheck
npm run validate:migrations
npm run test
npm run build
```

Then commit. Push only after manual smoke of CN flow + receipt creation.
