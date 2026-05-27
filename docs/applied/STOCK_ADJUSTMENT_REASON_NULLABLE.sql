-- Stock Adjustment: make reason optional
-- Date: 2026-05-26
-- DB-level gating was the last enforcer of mandatory reason. Frontend
-- validation is being dropped in the same change. Bulk import and the
-- new-product flow still auto-populate a reason, so existing rows stay
-- meaningful even with the constraint relaxed.

ALTER TABLE public.stock_adjustments
  ALTER COLUMN reason DROP NOT NULL;
