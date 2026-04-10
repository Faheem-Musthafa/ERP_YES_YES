# ADR-002: Domain RPC Boundary For Business Transactions

- Status: Proposed
- Date: 2026-04-10

## Context

Several business workflows are split across multiple client-side writes:
- Create order header + items
- Approve order items + order status
- Bill order + follow-up metadata updates

This causes partial-write risk and race conditions under retries, failures, and concurrent edits.

## Decision Drivers

- Atomicity for financial and stock operations
- Idempotency under retries
- Consistent auditability
- Simpler client orchestration

## Options Considered

1. Keep client multi-step writes with compensating rollback
2. Move all critical workflows to command RPCs in Postgres
3. Build dedicated backend service for orchestration

## Decision

Adopt option 2 now.

Create command-style RPCs for each critical workflow and call only those from frontend pages.

## Consequences

### Positive

- True transactional consistency
- Smaller client logic surface for errors
- Better audit trail and policy control

### Negative

- Additional SQL function maintenance
- Requires careful versioning of RPC contracts

## Implementation Plan

1. Add/upgrade command RPCs:
   - `create_order_atomic`
   - `approve_order_atomic`
   - `bill_order_atomic` (idempotent key support)
   - `create_grn_atomic` (header + items + stock + PO update)
2. Enforce authorization checks in each command.
3. Add outbox/audit inserts in the same transaction.
4. Replace page-level multi-write logic to call command RPCs only.
5. Add contract tests for each RPC happy-path and rollback path.

## Validation

- Simulate partial network failures and retries.
- Verify no orphan headers/items.
- Verify stock and financial totals remain consistent.
