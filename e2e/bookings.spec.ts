import { test, expect } from '@playwright/test';
import { loginToPlay } from './auth-helper';

test.describe('Aevo Play - Virtual Floor Plan & Public Booking Link Specifications', () => {
  test('Customer Public Booking Journey (4 Steps)', async ({ page }) => {
    // 1. Navigate to Customer Public Booking route (publicly accessible, no SSO needed)
    await page.goto('http://localhost:4331/modern/book', { waitUntil: 'domcontentloaded' });

    // Step 1: Booking Criteria
    await expect(page.locator('text=ขั้นตอนที่ 1: กำหนดวันและเวลาที่ต้องการใช้งาน')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=เลือกช่วงเวลาใช้งาน:')).toBeVisible();

    // Select time window
    const timePill = page.locator('button:has-text("14:00 - 16:00")');
    await expect(timePill).toBeVisible();
    await timePill.click();

    // Proceed to Step 2
    await page.click('button:has-text("ถัดไป: เลือกตำแหน่งบนผังจำลอง")');

    // Step 2: Interactive Visual Floor Map
    await expect(page.locator('text=ว่าง (เลือกได้)')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=ไม่ว่าง / มีผู้ใช้งาน')).toBeVisible();

    // Test map element click & Bottom Sheet
    const availableSpot = page.locator('.aevo-customer-map-element.is-available').first();
    await expect(availableSpot).toBeVisible();
    await availableSpot.click();

    // Bottom sheet details modal should appear
    await expect(page.locator('.aevo-bottom-sheet')).toBeVisible();
    await expect(page.locator('button:has-text("ยืนยันเลือกตำแหน่งนี้")')).toBeVisible();

    // Confirm spot selection to go to Step 3
    await page.click('button:has-text("ยืนยันเลือกตำแหน่งนี้")');

    // Step 3: Customer Details & 10-Minute Lock
    await expect(page.locator('text=ระบบกำลังล็อคตำแหน่ง')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.hold-timer')).toBeVisible();

    // Fill customer contact details
    await page.fill('input[placeholder*="คุณสมชาย"]', 'คุณกิตติศักดิ์ พัฒนา');
    await page.fill('input[type="tel"]', '081-234-5678');
    await page.fill('input[type="email"]', 'kittisak@example.com');

    // Submit booking
    await page.click('button:has-text("ยืนยันการจองและออกบัตรดิจิทัล")');

    // Step 4: Digital Reservation Pass
    await expect(page.locator('text=การจองเสร็จสมบูรณ์เรียบร้อย!')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=DIGITAL RESERVATION PASS')).toBeVisible();
    await expect(page.locator('button:has-text("เพิ่มลงใน Calendar")')).toBeVisible();
    await expect(page.locator('a:has-text("แผนที่นำทาง")')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/customer-digital-pass.png', fullPage: true });
  });

  test('Public Link: Map and List View Alternative Switching', async ({ page }) => {
    await page.goto('http://localhost:4331/modern/book', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=ขั้นตอนที่ 1: กำหนดวันและเวลาที่ต้องการใช้งาน')).toBeVisible({ timeout: 10_000 });
    
    // Select time slot to ensure client is hydrated
    const timePill = page.locator('button:has-text("14:00 - 16:00")');
    await expect(timePill).toBeVisible({ timeout: 10_000 });
    await timePill.click();

    await page.click('button:has-text("ถัดไป: เลือกตำแหน่งบนผังจำลอง")');

    // Switch to List View
    await expect(page.locator('button:has-text("มุมมองรายการ")')).toBeVisible({ timeout: 10_000 });
    await page.click('button:has-text("มุมมองรายการ")');
    await expect(page.locator('.aevo-customer-list-view')).toBeVisible({ timeout: 10_000 });

    // Switch back to Map View
    await page.click('button:has-text("มุมมองผัง")');
    await expect(page.locator('.aevo-customer-canvas-viewport')).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: 'e2e/screenshots/customer-map-view.png', fullPage: true });
  });

  test('Backoffice Spaces & Floor Plans (Designer, Inventory, Public Links)', async ({ page }) => {
    // Authenticate
    await loginToPlay(page, '/modern');

    // Click sidebar navigation to Spaces & Floor Plans
    const venuesNav = page.locator('a.play-nav__item:has-text("ผังและทรัพยากร")');
    await expect(venuesNav).toBeVisible({ timeout: 15_000 });
    await venuesNav.click();
    await page.waitForURL('**/venues**', { timeout: 15_000 });

    // Verify 3 Top Tabs
    const tabStrip = page.locator('.aevo-tab-strip');
    await expect(tabStrip).toBeVisible({ timeout: 15_000 });
    await expect(tabStrip.locator('button').nth(0)).toContainText('ผังพื้นที่');
    await expect(tabStrip.locator('button').nth(1)).toContainText('รายการทรัพยากร');
    await expect(tabStrip.locator('button').nth(2)).toContainText('ลิงก์และ QR Code');

    // Tab 1: Visual Floor Plan Designer Canvas
    await expect(page.locator('.aevo-designer')).toBeVisible();
    await expect(page.locator('.aevo-designer-sidebar')).toBeVisible();
    await expect(page.locator('.aevo-designer-canvas-viewport')).toBeVisible();
    await expect(page.locator('.aevo-designer-inspector')).toBeVisible();

    // Tab 2: Switch to Resource Inventory List
    await tabStrip.locator('button').nth(1).click();
    await expect(page.locator('text=รายการทรัพยากรที่เปิดให้จอง')).toBeVisible({ timeout: 10_000 });

    // Tab 3: Switch to Public Booking Links & QR Studio
    await tabStrip.locator('button').nth(2).click();
    await expect(page.locator('text=ลิงก์การจองสำหรับลูกค้า (Public Booking Links)')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=นโยบายการจองผ่านลิงก์สาธารณะ')).toBeVisible();

    // Test Table Stand Preview modal
    await page.click('button:has-text("ดูตัวอย่างป้ายตั้งโต๊ะพิมพ์ได้")');
    await expect(page.locator('.aevo-print-stand-modal')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=สแกนเพื่อจองโต๊ะหรือสนาม')).toBeVisible();

    // Close modal
    await page.click('button:has-text("ปิด")');
    await expect(page.locator('.aevo-print-stand-modal')).not.toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/backoffice-spaces-studio.png', fullPage: true });
  });

  test('Live Operations Floor View & Time Slider in Reservations', async ({ page }) => {
    // Authenticate
    await loginToPlay(page, '/modern');

    // Click sidebar navigation to Reservations & Calendar
    const bookingsNav = page.locator('a.play-nav__item:has-text("ปฏิทินและการจอง")');
    await expect(bookingsNav).toBeVisible({ timeout: 15_000 });
    await bookingsNav.click();
    await page.waitForURL('**/bookings**', { timeout: 15_000 });

    // Verify 3 Operational Tabs
    const tabStrip = page.locator('.aevo-tab-strip');
    await expect(tabStrip).toBeVisible({ timeout: 15_000 });
    await expect(tabStrip.locator('button').nth(0)).toContainText('มุมมองปฏิทิน');
    await expect(tabStrip.locator('button').nth(1)).toContainText('มุมมองผังสด');
    await expect(tabStrip.locator('button').nth(2)).toContainText('รายการคำขอจอง');

    // Switch to Live Operations Floor tab
    await tabStrip.locator('button').nth(1).click();

    // Verify Live Operations components
    await expect(page.locator('.aevo-live-floor')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=LIVE MONITOR')).toBeVisible();
    await expect(page.locator('.aevo-time-slider-panel')).toBeVisible();
    await expect(page.locator('.aevo-time-range-input')).toBeVisible();

    // Switch to Booking Requests Table
    await tabStrip.locator('button').nth(2).click();
    await expect(page.locator('text=รายการคำขอจองทั้งหมด (Booking Requests)')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[placeholder*="ค้นหารหัสจอง"]')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/live-operations-floor.png', fullPage: true });
  });
});
