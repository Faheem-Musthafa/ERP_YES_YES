import { test, expect } from '@playwright/test';

test.describe('Accounts – core pages render', () => {
  const pages = [
    { path: '/accounts', heading: /accounts overview|dashboard/i },
    { path: '/accounts/pending-orders', heading: /pending|orders/i },
    { path: '/accounts/back-orders', heading: /back.?orders?/i },
    { path: '/accounts/billing', heading: /billing/i },
    { path: '/accounts/sales', heading: /sales/i },
    { path: '/accounts/collection-status', heading: /collection/i },
    { path: '/accounts/payments', heading: /payments/i },
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
