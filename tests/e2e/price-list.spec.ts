import { test, expect } from '@playwright/test';

test.describe('Sales – Price List', () => {
  test('navigates to price list and shows header', async ({ page }) => {
    await page.goto('/sales/price-list');
    await expect(page.getByRole('heading', { name: 'Price List' })).toBeVisible();
    await expect(page.getByText(/dealer pricing tiers/i)).toBeVisible();
  });

  test('search box filters rows', async ({ page }) => {
    await page.goto('/sales/price-list');
    const search = page.getByPlaceholder(/search by name/i);
    await expect(search).toBeVisible();
    await search.fill('zzz-nonexistent-' + Date.now());
    await expect(page.getByText(/no products match/i)).toBeVisible({ timeout: 10_000 });
  });

  test('low stock toggle button changes label', async ({ page }) => {
    await page.goto('/sales/price-list');
    const toggle = page.getByRole('button', { name: /show low stock only/i });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole('button', { name: /showing low stock/i })).toBeVisible();
  });

  test('note dialog opens and validates input', async ({ page }) => {
    await page.goto('/sales/price-list');
    const noteButton = page.getByRole('button', { name: /add note|edit note/i }).first();
    const hasRows = await noteButton.isVisible().catch(() => false);
    test.skip(!hasRows, 'No products in DB to test note dialog against');
    await noteButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const saveBtn = page.getByRole('button', { name: /save note/i });
    await expect(saveBtn).toBeDisabled();
    const textarea = page.locator('[role="dialog"] textarea').first();
    await textarea.fill('Test note from Playwright');
    await expect(saveBtn).toBeEnabled();
    await page.getByRole('button', { name: /^cancel$/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});
