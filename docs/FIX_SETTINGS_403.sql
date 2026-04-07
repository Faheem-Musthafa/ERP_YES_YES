-- Fix settings table 403 error
-- Run this in Supabase SQL Editor

-- First, check if your user exists in the users table as admin
-- Replace 'YOUR_AUTH_USER_ID' with your actual auth.users ID
-- You can find your ID by running: SELECT id, email FROM auth.users;

-- Example: Add yourself as admin if not already
-- INSERT INTO users (id, full_name, role, is_active)
-- VALUES ('YOUR_AUTH_USER_ID', 'Admin User', 'admin', true)
-- ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true;

-- Verify your user has admin role
SELECT id, full_name, role, is_active FROM users WHERE role = 'admin';

-- If no admin users exist, you need to add one:
-- 1. Get your auth user ID:
SELECT id, email FROM auth.users LIMIT 5;

-- 2. Insert or update your user in the users table with admin role:
-- INSERT INTO users (id, full_name, email, role, is_active)
-- VALUES (
--   'YOUR_AUTH_USER_ID_HERE',  -- Copy your ID from above query
--   'Your Name',
--   'your.email@example.com',
--   'admin',
--   true
-- )
-- ON CONFLICT (id) DO UPDATE 
-- SET role = 'admin', is_active = true;

-- After adding yourself as admin, the settings page should work
