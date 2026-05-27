import { test, expect } from '@playwright/test';

/**
 * Unauthenticated coverage: every protected route in the app must redirect to
 * /login. Catalogue mirrors src/app/App.tsx route table.
 */
const PROTECTED_ROUTES = [
  // Admin
  '/admin',
  '/admin/staff',
  '/admin/customers',
  '/admin/customers/new',
  '/admin/customers/00000000-0000-0000-0000-000000000000/edit',
  '/admin/customer-analysis',
  '/admin/brands',
  '/admin/products',
  '/admin/sales',
  '/admin/reports',
  '/admin/drivers',
  '/admin/activity',
  '/admin/settings',
  // Sales
  '/sales',
  '/sales/create-order',
  '/sales/credit-note',
  '/sales/my-orders',
  '/sales/my-customers',
  '/sales/receipt',
  '/sales/my-collection',
  '/sales/collection-status',
  '/sales/back-orders',
  '/sales/approved-sales',
  '/sales/price-list',
  '/sales/stock-transfer',
  // Accounts
  '/accounts',
  '/accounts/collection-status',
  '/accounts/pending-orders',
  '/accounts/back-orders',
  '/accounts/billing',
  '/accounts/sales',
  '/accounts/payments',
  // Inventory
  '/inventory',
  '/inventory/stock',
  '/inventory/brands',
  '/inventory/products',
  '/inventory/adjustment',
  '/inventory/transfer',
  '/inventory/reports',
  '/inventory/delivery',
  // Procurement
  '/procurement',
  '/procurement/orders',
  '/procurement/history',
  '/procurement/suppliers',
  '/procurement/grn',
  '/procurement/reports',
  // Shared
  '/stock',
];

test.describe('App smoke – unauthenticated', () => {
  test('root redirects to /login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('unknown route falls through to /login via catch-all', async ({ page }) => {
    await page.goto('/this/route/does/not/exist-' + Date.now());
    await page.waitForURL('**/login', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('change-password without recovery flow bounces to /login', async ({ page }) => {
    await page.goto('/change-password');
    await page.waitForURL('**/login', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login page renders required form fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /forgot password/i })).toBeVisible();
  });

  test('login form has correct input types and attributes', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#email')).toHaveAttribute('type', 'email');
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
  });

  test('login rejects empty submission', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('login rejects malformed email', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('not-an-email');
    await page.locator('#password').fill('wrong-pass');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('login rejects invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill(`nobody+${Date.now()}@example.invalid`);
    await page.locator('#password').fill('definitely-wrong-password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(2500);
    await expect(page).toHaveURL(/\/login/);
  });

  test('forgot password requires email first', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /forgot password/i }).click();
    // Stays on /login, toast error shown by sonner; URL unchanged.
    await expect(page).toHaveURL(/\/login/);
  });

  for (const route of PROTECTED_ROUTES) {
    test(`protected route ${route} redirects unauthenticated`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL('**/login', { timeout: 15_000 });
      await expect(page).toHaveURL(/\/login/);
      // Form must still be reachable after redirect
      await expect(page.locator('#email')).toBeVisible();
    });
  }
});

test.describe('Static assets', () => {
  test('Vite renders the root HTML shell with #root mount node', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('#root')).toBeAttached();
  });

  test('no console errors on initial load of /login', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // Allow Supabase 401 / auth probes; only fail on true JS exceptions.
    const fatal = errors.filter((line) =>
      !/supabase|GoTrue|401|Failed to load resource|net::|favicon/i.test(line),
    );
    expect(fatal).toEqual([]);
  });
});
