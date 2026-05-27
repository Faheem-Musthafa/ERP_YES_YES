-- Customers: add company ownership (LLP / YES YES / Zekon)
-- Date: 2026-05-27
-- Customers were created without recording which OWN company they belong to.
-- Adds nullable company column so legacy rows keep working; new customer creation
-- requires it at the form layer. Backfill manually via the Customers admin screen.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS company company_enum;

CREATE INDEX IF NOT EXISTS idx_customers_company
  ON public.customers (company)
  WHERE company IS NOT NULL;
