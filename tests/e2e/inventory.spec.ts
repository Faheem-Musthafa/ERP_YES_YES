import { test, expect } from '@playwright/test';

test.describe('Inventory – core pages render', () => {
  const pages = [
    { path: '/inventory', heading: /inventory dashboard|dashboard/i },
    { path: '/inventory/stock', heading: /stock/i },
    { path: '/inventory/brands', heading: /brands/i },
    { path: '/inventory/products', heading: /products/i },
    { path: '/inventory/adjustment', heading: /adjustment/i },
    { path: '/inventory/transfer', heading: /transfer/i },
    { path: '/inventory/reports', heading: /reports/i },
    { path: '/inventory/delivery', heading: /delivery/i },
    { path: '/stock', heading: /stock/i },
  ];

  for (const { path, heading } of pages) {
    test(`${path} loads without crashing`, async ({ page }) => {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 15_000 });
    });
  }
});
