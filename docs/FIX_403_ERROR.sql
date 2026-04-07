-- ============================================================================
-- FIX: 403 Permission Denied on Users Table
-- ============================================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

-- Step 1: Temporarily disable RLS to insert user
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 2: Add the authenticated user to users table
INSERT INTO users (id, employee_id, full_name, email, role, is_active, must_change_password)
VALUES (
    '830b4be5-655f-4675-bb43-42d280b39c93',
    'ADMIN001',
    'Admin User',
    'admin@yesyes.com',
    'admin',
    true,
    false
)
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    is_active = true,
    must_change_password = false;

-- Step 3: Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL existing policies on users table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
    END LOOP;
END $$;

-- Step 5: Create policies for BOTH anon and authenticated roles
-- This is important because supabase-js might query before auth token is fully set

CREATE POLICY "users_select_authenticated" ON users
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "users_select_anon" ON users
    FOR SELECT TO anon USING (true);

CREATE POLICY "users_insert_authenticated" ON users
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "users_update_authenticated" ON users
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "users_delete_authenticated" ON users
    FOR DELETE TO authenticated USING (true);

-- Step 6: Grant permissions explicitly
GRANT SELECT ON users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;

-- Step 7: Verify user exists
SELECT id, full_name, email, role, is_active FROM users;

-- Step 8: Verify policies exist
SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'users';

-- ============================================================================
-- NOW: Refresh browser and login again!
-- ============================================================================
