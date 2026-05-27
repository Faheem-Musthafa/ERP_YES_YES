import { test, expect } from '@playwright/test';

test.describe('Admin – core pages render', () => {
  const pages = [
    { path: '/admin', heading: /good (morning|afternoon|evening)/i },
    { path: '/admin/staff', heading: /team|staff/i },
    { path: '/admin/customers', heading: /customers/i },
    { path: '/admin/brands', heading: /brands/i },
    { path: '/admin/products', heading: /products/i },
    { path: '/admin/sales', heading: /sales|orders/i },
    { path: '/admin/reports', heading: /reports/i },
    { path: '/admin/drivers', heading: /drivers/i },
    { path: '/admin/activity', heading: /activity/i },
    { path: '/admin/settings', heading: /settings/i },
    { path: '/admin/customer-analysis', heading: /customer/i },
  ];

  for (const { path, heading } of pages) {
    test(`${path} loads without crashing`, async ({ page }) => {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 15_000 });
    });
  }

  test('admin can open new customer form', async ({ page }) => {
    await page.goto('/admin/customers/new');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /customer/i }).first()).toBeVisible();
  });
});
