import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.resolve(process.cwd(), 'playwright/.auth');
fs.mkdirSync(STORAGE_DIR, { recursive: true });

interface RoleConfig {
  role: 'admin' | 'sales' | 'accounts' | 'inventory' | 'procurement';
  emailEnv: string;
  passwordEnv: string;
}

const ROLES: RoleConfig[] = [
  { role: 'admin', emailEnv: 'E2E_ADMIN_EMAIL', passwordEnv: 'E2E_ADMIN_PASSWORD' },
  { role: 'sales', emailEnv: 'E2E_SALES_EMAIL', passwordEnv: 'E2E_SALES_PASSWORD' },
  { role: 'accounts', emailEnv: 'E2E_ACCOUNTS_EMAIL', passwordEnv: 'E2E_ACCOUNTS_PASSWORD' },
  { role: 'inventory', emailEnv: 'E2E_INVENTORY_EMAIL', passwordEnv: 'E2E_INVENTORY_PASSWORD' },
  { role: 'procurement', emailEnv: 'E2E_PROCUREMENT_EMAIL', passwordEnv: 'E2E_PROCUREMENT_PASSWORD' },
];

export const storageStatePath = (role: RoleConfig['role']) =>
  path.join(STORAGE_DIR, `${role}.json`);

for (const { role, emailEnv, passwordEnv } of ROLES) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    const email = (process.env[emailEnv] ?? '').trim();
    const password = (process.env[passwordEnv] ?? '').trim();
    setup.skip(!email || !password, `${emailEnv}/${passwordEnv} not set`);

    await page.goto('/login');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 }),
      page.getByRole('button', { name: /sign in/i }).click(),
    ]);

    // Confirm we landed on an authenticated route
    await expect(page).not.toHaveURL(/\/login/);

    await page.context().storageState({ path: storageStatePath(role) });
  });
}
