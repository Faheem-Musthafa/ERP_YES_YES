# ADR-003: Observability And Operational Guardrails

- Status: Proposed
- Date: 2026-04-10

## Context

Current operational signals rely mostly on client toasts and console logs. Realtime subscriptions are limited to a narrow subset of workflows, and there is no unified telemetry strategy for incidents or regression diagnosis.

## Decision Drivers

- Faster incident detection and triage
- Traceability of business-critical events
- Better reliability under intermittent Supabase/network conditions

## Options Considered

1. Keep ad-hoc logging and toasts
2. Add structured client/server telemetry, error reporting, and domain audit events
3. Build full in-house observability stack

## Decision

Adopt option 2 using managed tooling.

## Consequences

### Positive

- Better MTTR and issue attribution
- Clearer audit history for financial/stock events
- Better user-impact visibility

### Negative

- Added integration effort
- Ongoing telemetry cost

## Implementation Plan

1. Add centralized error reporting (frontend + RPC failures).
2. Standardize domain event logs from RPCs:
   - order created/approved/billed
   - stock adjusted/transferred
   - delivery status changes
3. Add correlation IDs per workflow execution.
4. Add request timeout wrapper for Supabase client fetch.
5. Expand realtime subscriptions for high-change views where staleness is harmful.

## Validation

- Trigger synthetic failures and confirm alert visibility.
- Verify event logs reconstruct end-to-end workflow timeline.
- Confirm timeouts fail fast and UI recovers predictably.
