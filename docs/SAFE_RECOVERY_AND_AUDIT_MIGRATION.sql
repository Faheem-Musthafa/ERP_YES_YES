-- Safe recovery + audit support for archive/restore workflows.
-- Apply after SECURITY_TRANSACTION_HARDENING.sql and before enabling archive UI in production.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Archive metadata for recoverable master-data tables
-- -----------------------------------------------------------------------------

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID,
  ADD COLUMN IF NOT EXISTS delete_reason TEXT,
  ADD COLUMN IF NOT EXISTS restored_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restored_by UUID;

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID,
  ADD COLUMN IF NOT EXISTS delete_reason TEXT,
  ADD COLUMN IF NOT EXISTS restored_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restored_by UUID;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID,
  ADD COLUMN IF NOT EXISTS delete_reason TEXT,
  ADD COLUMN IF NOT EXISTS restored_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restored_by UUID;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID,
  ADD COLUMN IF NOT EXISTS delete_reason TEXT,
  ADD COLUMN IF NOT EXISTS restored_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restored_by UUID;

ALTER TABLE public.delivery_agents
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID,
  ADD COLUMN IF NOT EXISTS delete_reason TEXT,
  ADD COLUMN IF NOT EXISTS restored_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restored_by UUID;

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_brands_deleted_at ON public.brands(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON public.customers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_delivery_agents_deleted_at ON public.delivery_agents(deleted_at);

-- -----------------------------------------------------------------------------
-- 2. Recovery audit trail
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.data_recovery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_table TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_label TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('archived', 'restored', 'voided', 'reversed')),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_recovery_events_created_at
  ON public.data_recovery_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_recovery_events_entity
  ON public.data_recovery_events(entity_table, entity_id, created_at DESC);

ALTER TABLE public.data_recovery_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recovery_events_select_authenticated ON public.data_recovery_events;
CREATE POLICY recovery_events_select_authenticated
ON public.data_recovery_events
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS recovery_events_insert_authenticated ON public.data_recovery_events;
CREATE POLICY recovery_events_insert_authenticated
ON public.data_recovery_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT ON public.data_recovery_events TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. Financial soft-void support
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'Voided'
      AND enumtypid = 'public.collection_status_enum'::regtype
  ) THEN
    ALTER TYPE public.collection_status_enum ADD VALUE 'Voided';
  END IF;
END $$;

COMMIT;
