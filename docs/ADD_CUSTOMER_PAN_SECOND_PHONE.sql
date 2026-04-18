-- Add PAN No and second phone fields for customers
-- Run this in Supabase SQL Editor before using the new fields in UI.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS pan_no text,
  ADD COLUMN IF NOT EXISTS second_phone text;

COMMENT ON COLUMN public.customers.pan_no IS 'Customer PAN number';
COMMENT ON COLUMN public.customers.second_phone IS 'Customer alternate/secondary phone number';
