# Supabase Recovery Runbook

## Everyday Mistakes
- Check the affected admin screen first.
- Archived brands, products, customers, staff accounts, and drivers should be restored from the app instead of touching the database directly.
- Billing reversals should use the reversal approval flow so stock is returned and finance records are voided instead of deleted.

## When Data Looks Missing
1. Confirm whether the record is archived or truly gone.
2. Check the `data_recovery_events` table for recent `archived`, `restored`, `voided`, or `reversed` actions.
3. Check the related table directly for `is_active = false` or populated `deleted_at`.
4. Only move to database recovery if the row is not present anymore.

## Disaster Recovery With Supabase
1. Confirm PITR/backups are enabled for the project before relying on this runbook.
2. Identify the approximate deletion timestamp and affected tables.
3. Restore to a temporary recovery target or point-in-time environment first.
4. Extract only the missing rows plus any dependent rows needed for referential integrity.
5. Compare recovered rows against production before replaying them.
6. Reinsert or replay them in production during a controlled maintenance window if the loss is business-critical.
7. Record the recovery in `data_recovery_events` or the incident log after the restore is complete.

## Minimum Operational Checklist
- Keep PITR enabled.
- Limit who can run destructive SQL in Supabase.
- Prefer archive/reversal flows over hard deletes in the app.
- Validate restored rows in a non-production target before writing back to production.
