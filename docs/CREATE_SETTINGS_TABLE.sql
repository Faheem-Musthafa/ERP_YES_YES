-- Create settings table for admin settings
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to ensure clean state
DROP POLICY IF EXISTS "Allow authenticated users to manage settings" ON settings;
DROP POLICY IF EXISTS "Only admins can manage settings" ON settings;

-- Only allow admin role to manage settings
CREATE POLICY "Only admins can manage settings"
ON settings FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
        AND users.is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
        AND users.is_active = true
    )
);

-- Insert default settings that match the Settings page structure
INSERT INTO settings (key, value) VALUES 
    ('company_name', '"YES YES"'),
    ('company_gstin', '""'),
    ('company_address', '""'),
    ('company_phone', '""'),
    ('company_email', '""'),
    ('default_invoice_type', '"GST"'),
    ('enable_auto_approval', 'false'),
    ('max_discount_percentage', '20'),
    ('financial_year_start', '4'),
    ('financial_year_end', '3'),
    ('godowns', '["Kottakkal", "Chenakkal"]'),
    ('districts', '["Kasaragod", "Kannur", "Wayanad", "Kozhikode", "Malappuram", "Palakkad", "Thrissur", "Ernakulam", "Idukki", "Kottayam", "Alappuzha", "Pathanamthitta", "Kollam", "Thiruvananthapuram"]'),
    ('vehicle_types', '["2-Wheeler", "3-Wheeler", "4-Wheeler", "Truck", "Others"]')
ON CONFLICT (key) DO NOTHING;

-- Verify
SELECT * FROM settings;
