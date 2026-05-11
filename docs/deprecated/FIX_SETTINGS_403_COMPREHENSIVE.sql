-- Comprehensive fix for settings table 403 error
-- Run this ENTIRE script in Supabase SQL Editor

-- Step 1: First, find your auth user ID manually
-- Run this and copy your ID:
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 10;

-- Step 2: Add yourself as admin user
-- IMPORTANT: Replace 'YOUR_AUTH_USER_ID_HERE' with your actual ID from Step 1
INSERT INTO users (id, full_name, email, role, is_active, must_change_password)
VALUES (
    'YOUR_AUTH_USER_ID_HERE'::uuid,  -- REPLACE THIS with your auth.users ID
    'Admin User',
    'your.email@example.com',  -- REPLACE with your email
    'admin',
    true,
    false
)
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', is_active = true, must_change_password = false;

-- Step 3: Verify you're now an admin
SELECT id, full_name, email, role, is_active 
FROM users 
WHERE role = 'admin';

-- Step 4: Grant table permissions
GRANT ALL ON settings TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 5: Verify the RLS policy exists
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'settings';

-- Step 6: After running this, refresh your browser and try accessing Settings page
-- The 403 error should be gone!
