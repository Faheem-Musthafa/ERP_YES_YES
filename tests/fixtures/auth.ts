import { test as base, expect, Page } from '@playwright/test';

interface AuthCredentials {
  email: string;
  password: string;
}

const readCreds = (rolePrefix: string): AuthCredentials | null => {
  const email = process.env[`${rolePrefix}_EMAIL`];
  const password = process.env[`${rolePrefix}_PASSWORD`];
  if (!email || !password) return null;
  return { email, password };
};

export const ADMIN_CREDENTIALS = readCreds('E2E_ADMIN');
export const SALES_CREDENTIALS = readCreds('E2E_SALES');

export const requireAdmin = (): AuthCredentials => {
  if (!ADMIN_CREDENTIALS) {
    base.skip(true, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD env vars not set');
  }
  return ADMIN_CREDENTIALS!;
};

export const requireSales = (): AuthCredentials => {
  if (!SALES_CREDENTIALS) {
    base.skip(true, 'E2E_SALES_EMAIL / E2E_SALES_PASSWORD env vars not set');
  }
  return SALES_CREDENTIALS!;
};

export const loginAs = async (page: Page, creds: AuthCredentials) => {
  await page.goto('/login');
  await page.locator('#email').fill(creds.email);
  await page.locator('#password').fill(creds.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 }),
    page.getByRole('button', { name: /sign in/i }).click(),
  ]);
};

export const test = base.extend({});
export { expect };
