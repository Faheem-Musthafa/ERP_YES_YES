# ADR-005: Dynamic Master Data Via Settings

- Status: Proposed
- Date: 2026-04-13

## Context

The system currently stores districts, vehicle types, and godown names in PostgreSQL enum types. This causes two production issues:

- Adding or renaming values requires schema migration instead of admin configuration.
- Settings page updates can diverge from database-enforced enum values and break transactional flows.

## Decision Drivers

- Allow admins to manage master data without deploying schema changes.
- Keep transactional RPCs safe by validating against a single source of truth.
- Preserve RLS and least-privilege controls while enabling settings CRUD.
- Avoid runtime outages from enum drift across frontend, RPCs, and tables.

## Options Considered

1. Keep enums and manually alter enum labels for every master-data change.
2. Move master data to dedicated lookup tables with foreign keys.
3. Move master data to `settings` JSON arrays and enforce via secured RPC validation.

## Decision

Adopt option 3 now:

- Convert enum columns to `text`.
- Store master values in `settings` keys (`godowns`, `districts`, `vehicle_types`).
- Add secure CRUD RPCs for add/update/delete operations.
- Rebuild transaction RPCs to validate values against settings at write time.

## Consequences

### Positive

- No schema migration needed for normal master-data changes.
- Settings page becomes the operational source of truth.
- Rename operations can propagate across dependent tables safely.
- Reduced coupling between frontend type unions and backend schema.

### Negative

- Validation moves from native enum constraints to function-level checks.
- Requires strict migration order and verification in production.
- Additional RPC logic must be maintained and tested.

## Implementation Plan

1. Run `docs/ENUM_TO_DYNAMIC_SETTINGS_MIGRATION.sql`.
2. Update frontend settings page to use CRUD RPCs including rename.
3. Keep hardening/idempotency migrations in place after enum removal.
4. Run typecheck/build and execute smoke tests for settings + transactions.

## Validation

- Confirm enum types are absent from `pg_type` in `public` schema.
- Confirm settings CRUD RPCs enforce admin-only write behavior.
- Confirm order/stock/grn RPCs reject values not present in settings.
- Confirm renaming a godown propagates to stock and transaction tables.