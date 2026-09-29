import { test, expect } from '@playwright/test';
import { loginToHub, loginToPlay, loginToAdmin, TEST_USER } from './auth-helper';

test.describe('Aevo Ecosystem Authentication & Authorization', () => {
  test('Hub Login: Logs in to Hub and verifies workspace access', async ({ page }) => {
    await loginToHub(page, TEST_USER.email, TEST_USER.password);

    // Verify workspace profile & permissions
    await expect(page.locator('text=chakkaphan chaiwong').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Aevo Hub').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Hub assignment verified')).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: 'e2e/hub-logged-in.png', fullPage: true });
  });

  test('Play Login via SSO: Opens Play, completes Hub SSO handoff, and verifies Play shell', async ({ page }) => {
    await loginToPlay(page, '/modern', TEST_USER.email, TEST_USER.password);

    // Verify Play shell context and navigation
    await expect(page.locator('.play-brand')).toContainText('Aevo Play', { timeout: 10_000 });
    await expect(page.locator('.play-sidebar')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=ภาพรวมสาขา').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=chakkaphan chaiwong').first()).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: 'e2e/play-logged-in.png', fullPage: true });
  });

  test('Admin Login: Logs in to Admin Platform Control Plane', async ({ page }) => {
    await loginToAdmin(page, TEST_USER.email, TEST_USER.password);

    // Verify Admin platform dashboard
    await expect(page.locator('text=Aevo Admin').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Platform control plane').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Platform access verified')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=SUPER_ADMIN').first()).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: 'e2e/admin-logged-in.png', fullPage: true });
  });
});
