# Architecture Review - 2026-04-10

## Scope

System reviewed: YES YES ERP (Vite + React SPA with Supabase backend).

Review focus:
- Security architecture and access boundaries
- Data consistency and transactional integrity
- Reliability and operability
- Performance and scale readiness

## Immediate Mitigations Applied

- Added Supabase global request timeout wrapper in src/app/supabase.ts.
- Added safe read-retry policy (GET/HEAD only) with bounded backoff in src/app/supabase.ts.
- Added baseline Vercel security headers in vercel.json.
- Added CI workflow gates in .github/workflows/ci.yml.
- Added SQL migration validation and security smoke tests in CI.
- Added idempotency wrapper migration for bill/delivery/GRN RPC retries.

## Findings (Ordered by Severity)

### Critical

1. Permissive RLS model effectively grants broad data access to any authenticated user.
   - Evidence:
     - docs/FIX_ALL_TABLES_RLS.sql creates SELECT/INSERT/UPDATE/DELETE policies with `USING (true)` and `WITH CHECK (true)` for many tables.
     - docs/FIX_403_ERROR.sql includes authenticated and anon read access on `users`.
     - docs/COMPLETE_DATABASE_SCHEMA.sql creates global permissive policy templates for all public tables.
   - Risk:
     - Role separation (admin, accounts, inventory, sales) can be bypassed at data layer.
     - Confidential data exposure and unauthorized state changes are possible.
   - Fix summary:
     - Replace blanket policies with role-scoped, tenant-safe policies.
     - Remove anon read access to internal user tables.
     - Introduce helper functions for role checks to avoid recursive policies.

2. Security-definer functions are broadly executable and not consistently enforcing caller authorization.
   - Evidence:
     - docs/CRITICAL_STABILIZATION_MIGRATION.sql grants execute on `create_delivery`, `update_delivery_status`, and `create_stock_adjustment_atomic` to `authenticated`.
     - docs/STOCK_DEDUCTION_ON_BILLING.sql grants execute on `bill_order_atomic` to `authenticated`.
   - Risk:
     - Any authenticated user may trigger privileged workflows if function-internal authorization is missing or weak.
   - Fix summary:
     - Enforce role checks and actor checks inside every privileged RPC.
     - Add explicit `SET search_path` to security-definer functions.
     - Restrict execute grants to least-privileged roles.

### High

3. Transactional boundaries are split between client and database functions.
   - Evidence:
     - src/app/pages/accounts/OrderReview.tsx updates each order item in loop, then updates order header.
     - src/app/pages/sales/CreateOrder.tsx inserts order then order_items, with manual rollback delete.
     - src/app/pages/accounts/Billing.tsx bills atomically via RPC, but then performs additional order update for PDF timestamp separately.
   - Risk:
     - Partial writes and inconsistent state during network errors or concurrent edits.
   - Fix summary:
     - Move each domain workflow into a single idempotent RPC command.
     - Keep UI as orchestrator only, not a transaction coordinator.

4. Number generation uses `MAX + 1` patterns under concurrency.
   - Evidence:
     - docs/COMPLETE_DATABASE_SCHEMA.sql functions `generate_order_number`, `generate_delivery_number`, `generate_grn_number`, `generate_po_number` use `MAX(...) + 1`.
   - Risk:
     - Duplicate key races under concurrent requests and retry storms.
   - Fix summary:
     - Replace with sequence-backed counters and retry-safe unique generation.

5. Real-time and observability are uneven.
   - Evidence:
     - Realtime subscriptions found only on GRN page.
     - Logging is primarily console-based and toasts; no centralized audit/event pipeline from app.
   - Risk:
     - Cross-tab stale data, difficult incident diagnosis.
   - Fix summary:
     - Add domain event subscriptions for high-change datasets.
     - Emit auditable events from RPCs and centralize client error telemetry.

### Medium

6. Supabase client had no global request timeout/retry posture.
   - Evidence:
     - src/app/supabase.ts initializes createClient with URL + anon key only.
   - Risk:
     - Long-hanging requests can freeze UX and increase operational uncertainty.
   - Fix summary:
     - Use custom fetch with AbortController timeout and standard retry policy for idempotent reads.
   - Status:
     - Timeout wrapper and safe read-retry policy implemented.

7. Missing production security headers baseline at edge.
   - Evidence:
     - vercel.json defines rewrites only.
     - index.html has no CSP meta fallback.
   - Risk:
     - Increased XSS/clickjacking/data leakage exposure.
   - Fix summary:
     - Configure CSP, frame-ancestors, referrer-policy, and permissions-policy in Vercel headers.
   - Status:
     - Baseline headers implemented in vercel.json.

8. Delivery pipeline quality gates are minimal.
   - Evidence:
     - package.json scripts include dev/build/typecheck only.
     - CI workflow now added, but lint/test coverage depends on scripts being present.
   - Risk:
     - Regression risk and inconsistent deployment quality.
   - Fix summary:
     - Add CI gates: typecheck, lint, unit tests, migration validation, and build.
   - Status:
     - Typecheck/build gates, migration validation, and baseline security smoke tests implemented.

## Recommended Remediation Plan

### Phase 1 (Immediate: 24-72 hours)
- Freeze use of permissive fix scripts in production.
- Apply ADR-001 changes for RLS and grants.
- Patch security-definer RPCs with explicit role checks and `SET search_path`.

### Phase 2 (1-2 weeks)
- Implement ADR-002: move review/create/billing flows into command RPCs.
- Replace number generators with sequence-based allocators.
- Add idempotency keys for bill, delivery status, and GRN create. (Implemented via wrapper RPCs + app fallback)

### Phase 3 (2-4 weeks)
- Implement ADR-003 observability stack (structured logs + error reporting + audit events).
- Add realtime subscriptions where stale views cause business errors.
- Add supabase request timeout + retry wrappers.

### Phase 4 (2-4 weeks, parallel)
- Implement ADR-004 CI and release gates.
- Add migration verification and policy regression tests.

## Constraints and Assumptions

- Current system appears optimized for small-to-medium internal usage.
- If expected usage is above 100k requests/day, add read replicas, queue-backed async jobs, and explicit workload isolation.
- Cost-sensitive environments should prioritize managed observability and selective realtime streams.

## Success Metrics

- 0 permissive `USING (true)` policies on sensitive tables.
- 100 percent privileged RPCs with in-function authorization + audit events.
- 0 duplicate document number incidents under load tests.
- P95 API time under 400 ms for core queries.
- CI pass rate > 95 percent before production promotion.
