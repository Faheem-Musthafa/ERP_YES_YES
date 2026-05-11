# ERP Docs

## Layout

```
docs/
├── README.md                     (this file)
├── ATTRIBUTIONS.md               license + third-party credits
├── ERP_WORKFLOW.md               business-side workflow narrative
├── SUPABASE_SETUP.md             one-time project bootstrap
├── DATABASE_SETUP_GUIDE.md       schema overview for new devs
├── ADD_ADMIN_USER.md             runbook: create first admin user
├── SUPABASE_RECOVERY_RUNBOOK.md  runbook: restore archived rows
├── SECRETS_ROTATION.md           runbook: rotate Supabase keys
├── EDGE_FUNCTION_INVITE_USER.md  spec: invite-user edge function
├── architecture/                 architecture diagrams + ADRs
├── applied/                      migrations applied in current cycle
├── reference/                    schema dumps for reference only
└── deprecated/                   superseded migrations + old runbooks
```

## What is what

### Active runbooks (root)
Documentation a developer or admin actually reads day-to-day.

### `applied/`
SQL migrations currently in effect on the live Supabase project:

| File | Purpose |
|---|---|
| `INVOICE_NUMBER_SEQUENCES.sql` | Race-safe invoice / Credit Note / order number allocator. Drives `allocate_invoice_sequence`, `allocate_order_number`, `bill_credit_note_atomic`, `bill_credit_note_idempotent` (the latter has its auth/role check moved above the cache lookup). |
| `RLS_AUDIT.sql` | Role helper template (`is_role`, `is_active_user`, `current_user_role`) plus the role-gated policy pattern. Live policies were inlined into the per-table remediation migration. |

These files document the change. The authoritative ordered record is the Supabase `supabase_migrations.schema_migrations` table (visible via `mcp__supabase__list_migrations`).

Rolled back (moved to `deprecated/` on 2026-05-12):

- `P2_TAX_SCHEMA_EXTENSIONS.sql` — states master, HSN/tax_rate/UoM/cost_price, state_code, place_of_supply, per-line tax. `orders.round_off` kept; everything else dropped.
- `AUDIT_TRAIL.sql` — table + triggers dropped.
- `DELIVERY_ITEMS.sql` — table + triggers dropped.
- `PURCHASE_RETURNS.sql` — tables + RPCs dropped.

The `Voided` value on `order_status_enum` and the `is_active_user()` helper remain live (in use by code / future RLS).

### `reference/`
Historical schema snapshots. Do not run.

| File | Purpose |
|---|---|
| `A_TO_Z_SCHEMA_FROM_SUPABASE_2026_04_16.sql` | Full schema dump from 2026-04-16 |
| `COMPLETE_DATABASE_SCHEMA.sql` | Earlier consolidated schema reference |

### `deprecated/`
Migrations that have already run against the live DB (and are now in the migration table), or one-off fix scripts that should never run again, or completed feature-launch summaries. Kept for git history.

The two scripts `FIX_ALL_TABLES_RLS.sql` and `FIX_403_ERROR.sql` carry a `DEPRECATED SCRIPT - DO NOT RUN` marker enforced by `scripts/security-smoke-test.mjs`.

## Applying a new migration

1. Write the migration SQL with a header comment explaining the why and a `DOWN` block at the bottom.
2. Put the file in `docs/applied/`.
3. Apply via `mcp__supabase__apply_migration` (or `supabase db push` from the CLI).
4. Re-run `npm run validate:migrations` and `npm run test`.
5. Commit.

## Operational state (as of 2026-05-12)

- All RLS policies role-gated (no `USING (true)` left).
- All `SECURITY DEFINER` RPCs have `search_path` pinned and PUBLIC EXECUTE revoked; signed-in users hold targeted grants.
- `invoice_sequences` allocator backs invoice + CN + order numbers — no client-side race.
- Audit trail trigger active on customers / products / orders / order_items / receipts / settings / suppliers.
- `product_stock_summary` view runs as `security_invoker`.

Manual follow-ups:
- Enable **HaveIBeenPwned** leaked-password check in Supabase Auth dashboard.
- Deploy the `invite-user` edge function per `EDGE_FUNCTION_INVITE_USER.md`.
- Fill in `hsn_code` on `products`, `state_code` on `customers` / `suppliers` where backfill could not derive from address.
