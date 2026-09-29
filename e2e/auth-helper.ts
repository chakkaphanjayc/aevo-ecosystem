import { expect, type Page } from '@playwright/test';

export const TEST_USER = {
  email: 'chakkaphan.pocki@gmail.com',
  password: 'Jnaimcee.007',
  name: 'chakkaphan chaiwong'
};

/**
 * Perform login to Aevo Hub directly.
 */
export async function loginToHub(
  page: Page,
  email = TEST_USER.email,
  password = TEST_USER.password
): Promise<void> {
  await page.goto('http://localhost:4330/modern/login');

  const emailInput = page.locator('#login-email');
  await expect(emailInput).toBeVisible({ timeout: 10_000 });
  await emailInput.fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL((url) => url.origin === 'http://localhost:4330' && !url.pathname.endsWith('/login'), { timeout: 15_000 });
}

/**
 * Navigate to Aevo Play, complete Hub SSO handoff, and return to Play shell.
 */
export async function loginToPlay(
  page: Page,
  targetPath = '/modern',
  email = TEST_USER.email,
  password = TEST_USER.password
): Promise<void> {
  await page.goto(`http://localhost:4331${targetPath}`);

  // SSO redirect to Hub login
  const emailInput = page.locator('#login-email');
  await expect(emailInput).toBeVisible({ timeout: 15_000 });
  await emailInput.fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('button[type="submit"]').click();

  // Exchange authorization code and return to Play
  await page.waitForURL((url) => url.origin === 'http://localhost:4331' && !url.pathname.includes('/auth/callback'), { timeout: 25_000 });
  await expect(page.locator('.play-brand')).toContainText('Aevo Play', { timeout: 15_000 });
}

/**
 * Perform login to Aevo Admin platform console.
 */
export async function loginToAdmin(
  page: Page,
  email = TEST_USER.email,
  password = TEST_USER.password
): Promise<void> {
  await page.goto('http://localhost:4335/login');

  const submitBtn = page.locator('button[type="submit"]');
  await expect(submitBtn).toBeEnabled({ timeout: 10_000 });

  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill(email);
  await page.locator('input[type="password"]').fill(password);
  await submitBtn.click();

  await page.waitForURL((url) => url.origin === 'http://localhost:4335' && !url.pathname.endsWith('/login'), { timeout: 15_000 });
}
