import { test, expect } from '@playwright/test';

test.describe('Sales – core pages render', () => {
  const pages = [
    { path: '/sales', heading: /my dashboard|dashboard/i },
    { path: '/sales/my-customers', heading: /customers/i },
    { path: '/sales/my-orders', heading: /orders/i },
    { path: '/sales/approved-sales', heading: /sales|approved/i },
    { path: '/sales/back-orders', heading: /back.?orders?/i },
    { path: '/sales/create-order', heading: /create|order/i },
    { path: '/sales/credit-note', heading: /credit/i },
    { path: '/sales/receipt', heading: /receipt/i },
    { path: '/sales/my-collection', heading: /collection/i },
    { path: '/sales/collection-status', heading: /collection/i },
    { path: '/sales/price-list', heading: /price list/i },
    { path: '/stock', heading: /stock/i },
  ];

  for (const { path, heading } of pages) {
    test(`${path} loads without crashing`, async ({ page }) => {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 15_000 });
    });
  }

  test('sidebar shows Price List entry', async ({ page }) => {
    await page.goto('/sales');
    await expect(page.getByRole('link', { name: /price list/i })).toBeVisible();
  });
});
