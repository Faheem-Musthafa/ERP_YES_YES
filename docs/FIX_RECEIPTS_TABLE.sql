-- Fix receipts table to allow null order_id for advance payments
-- Run this in Supabase SQL Editor

-- Make order_id nullable
ALTER TABLE receipts ALTER COLUMN order_id DROP NOT NULL;

-- Add missing columns for receipt entry
ALTER TABLE receipts 
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id),
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS received_date DATE,
  ADD COLUMN IF NOT EXISTS cheque_number TEXT,
  ADD COLUMN IF NOT EXISTS cheque_date DATE,
  ADD COLUMN IF NOT EXISTS on_account_of TEXT;

-- Verify changes
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'receipts' 
ORDER BY ordinal_position;
