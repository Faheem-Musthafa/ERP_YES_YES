# How to Add Admin User - Simple Guide

## Method 1: Supabase Dashboard (Easiest)

### Step 1: Create Auth User
1. Go to **Supabase Dashboard** → Your Project
2. Click **Authentication** (left sidebar)
3. Click **Users** tab
4. Click **Add User** → **Create New User**
5. Enter:
   - Email: `admin@yourcompany.com`
   - Password: `YourSecurePassword123!`
6. Click **Create User**
7. **Copy the User UID** (you'll need this)

### Step 2: Add to Users Table
1. Go to **SQL Editor**
2. Run this query (replace the UUID and details):

```sql
INSERT INTO users (id, employee_id, full_name, email, role, is_active)
VALUES (
    'paste-auth-user-uuid-here',  -- The UID from Step 1
    'EMP001',                      -- Employee ID
    'Admin User',                  -- Full name
    'admin@yourcompany.com',       -- Same email as auth
    'admin',                       -- Role: admin
    true                           -- Active
);
```

3. Click **Run**

✅ Done! Login with the email and password.

---

## Method 2: SQL Only (Advanced)

If you have the service_role key, run in SQL Editor:

```sql
-- This creates both auth user and users table entry
-- Note: Requires service_role access

-- Step 1: Create in users table (use a known UUID)
INSERT INTO users (id, employee_id, full_name, email, role, is_active)
VALUES (
    gen_random_uuid(),
    'EMP001',
    'Admin User', 
    'admin@yourcompany.com',
    'admin',
    true
);
```

Then create the auth user via Dashboard or Supabase Auth API.

---

## Quick Reference: User Roles

| Role | Access |
|------|--------|
| `admin` | Full access to everything |
| `sales` | Orders, customers, deliveries |
| `accounts` | Billing, receipts, collections |
| `inventory` | Stock, adjustments, transfers |
| `procurement` | Purchase orders, GRN, suppliers |

---

## Add More Users

```sql
-- Sales user
INSERT INTO users (id, employee_id, full_name, email, role, is_active)
VALUES ('auth-uuid', 'EMP002', 'Sales Person', 'sales@company.com', 'sales', true);

-- Accounts user
INSERT INTO users (id, employee_id, full_name, email, role, is_active)
VALUES ('auth-uuid', 'EMP003', 'Accountant', 'accounts@company.com', 'accounts', true);

-- Inventory user
INSERT INTO users (id, employee_id, full_name, email, role, is_active)
VALUES ('auth-uuid', 'EMP004', 'Stock Manager', 'inventory@company.com', 'inventory', true);
```

---

## Troubleshooting

### "User not found" after login
- Make sure the `id` in users table matches the auth user's UID exactly

### "Permission denied"
- Check `is_active = true`
- Verify role is spelled correctly (lowercase)

### Can't see certain pages
- Check the user's role has access to that feature
- Admin role has access to everything

---

## Example: Complete Admin Setup

```sql
-- After creating auth user with email admin@example.com
-- and getting UUID: a1b2c3d4-e5f6-7890-abcd-ef1234567890

INSERT INTO users (id, employee_id, full_name, email, role, is_active)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'ADMIN001',
    'System Administrator',
    'admin@example.com',
    'admin',
    true
);

-- Verify
SELECT * FROM users WHERE role = 'admin';
```

That's it! 🎉
