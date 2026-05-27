import { test, expect } from '@playwright/test';

test.describe('Procurement – core pages render', () => {
  const pages = [
    { path: '/procurement', heading: /procurement dashboard|dashboard/i },
    { path: '/procurement/orders', heading: /purchase|orders/i },
    { path: '/procurement/history', heading: /history/i },
    { path: '/procurement/suppliers', heading: /suppliers/i },
    { path: '/procurement/grn', heading: /grn|goods receipt/i },
    { path: '/procurement/reports', heading: /reports/i },
  ];

  for (const { path, heading } of pages) {
    test(`${path} loads without crashing`, async ({ page }) => {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 15_000 });
    });
  }
});
