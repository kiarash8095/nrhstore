// Explicit opt-in: these tests can mutate real carts/accounts or send SMS.
if (process.env.NRH_ALLOW_LIVE_MUTATIONS !== '1') {
  console.error('Live mutations are disabled. Set NRH_ALLOW_LIVE_MUTATIONS=1 only with authorization for a dedicated test environment.');
  process.exit(2);
}
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Playwright smoke test. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const runtime = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(runtime);
const { expect: baseExpect } = require(runtime + '/test');
const expect = baseExpect.configure({ timeout: 45000 });
const base = process.env.CART_TEST_BASE_URL || 'http://localhost:3000';
const backend = process.env.WP_API_URL || 'https://nrhstore.ir/wp-json';
const output = path.resolve('artifacts/cart');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'fa-IR' });
  const page = await context.newPage();
  const errors = [];
  const result = {};
  page.on('pageerror', error => errors.push(error.message));
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame() && !['about:blank', ''].includes(frame.url())) assert.equal(new URL(frame.url()).origin, new URL(base).origin, 'Navigation must stay inside Next.js.');
  });
  page.setDefaultTimeout(30000);
  try {
    const products = await fetch(backend + '/wc/store/v1/products?per_page=100&stock_status=instock').then(response => response.json());
    const product = products.find(item => item.type === 'simple' && item.is_purchasable && Number(item.prices.price) > 0);
    assert.ok(product);
    result.product_id = product.id;
    const url = '/products/' + encodeURIComponent(decodeURIComponent(product.slug));
    result.stage = 'product';
    await page.goto(base + url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    const add = page.getByRole('button', { name: 'افزودن به سبد خرید', exact: true }).first();
    await expect(add).toBeEnabled({ timeout: 45000 });
    await add.click();
    await expect(page.getByTestId('cart-toast')).toContainText('به سبد خرید اضافه شد');
    const drawer = page.getByTestId('cart-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByTestId('cart-item')).toHaveCount(1);
    result.stage = 'drawer-quantity';
    const plus = drawer.getByRole('button', { name: /افزایش تعداد/ });
    if (await plus.isEnabled()) {
      const response = page.waitForResponse(response => response.url().endsWith('/api/cart/update-item') && response.request().method() === 'POST');
      await plus.click();
      const cart = await (await response).json();
      assert.equal(cart.items[0].quantity, 2);
      const decrease = page.waitForResponse(response => response.url().endsWith('/api/cart/update-item') && response.request().method() === 'POST');
      await drawer.getByRole('button', { name: /کاهش تعداد/ }).click();
      assert.equal((await (await decrease).json()).items[0].quantity, 1);
    }
    await page.screenshot({ path: path.join(output, 'drawer-desktop.png') });
    await drawer.getByRole('button', { name: 'بستن سبد خرید', exact: true }).click();
    await expect(drawer).not.toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('cart-count')).toHaveText('۱');
    await page.getByRole('button', { name: /^سبد خرید،/ }).click();
    await expect(drawer.getByTestId('cart-item')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
    const recommended = page.waitForResponse(response => response.url().includes('/api/cart/recommendations?')).catch(() => null);
    await page.goto(base + '/cart', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('cart-item')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'خلاصه سفارش' })).toBeVisible();
    const recommendationResponse = await recommended;
    if (recommendationResponse?.ok() && (await recommendationResponse.json()).length) await expect(page.getByRole('heading', { name: 'شاید این‌ها را هم بپسندید' })).toBeVisible();
    await page.screenshot({ path: path.join(output, 'cart-desktop.png') });
    result.stage = 'checkout-form';
    await page.getByRole('link', { name: 'ادامه و تسویه‌حساب' }).click();
    await page.waitForURL('**/checkout');
    await expect(page.getByTestId('cart-item')).toHaveCount(1);
    const values = { first_name: 'آزمایش', last_name: 'سبد', phone: '09000000000', email: 'cart-test@example.invalid', city: 'همدان', address_1: 'آدرس آزمایشی؛ سفارش نهایی ثبت نشود', postcode: '6511111111' };
    for (const [name, value] of Object.entries(values)) await page.locator('input[name="' + name + '"]').fill(value);
    await page.locator('select[name="state"]').selectOption('HDN');
    for (const [name, value] of Object.entries(values)) await expect(page.locator('input[name="' + name + '"]')).toHaveValue(value);
    result.stage = 'checkout-save';
    const addressResponse = page.waitForResponse(response => response.url().endsWith('/api/cart/update-customer') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'ذخیره آدرس و محاسبه ارسال' }).click();
    assert.equal((await addressResponse).status(), 200);
    // This live guest smoke test must never initiate a real bank request.
    await expect(page.getByRole('button', { name: 'ادامه به مرحله پرداخت', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'برای پرداخت وارد حساب شوید' })).toBeVisible();
    result.checkout = 'guest payment blocked; direct-payment browser tests use intercepted APIs';
    await page.screenshot({ path: path.join(output, 'checkout-desktop.png'), fullPage: true });
    result.stage = 'mobile';
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + '/cart', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('cart-item')).toHaveCount(1);
    await page.screenshot({ path: path.join(output, 'cart-mobile.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Mobile page must not overflow horizontally.');
    await page.goto(base + url, { waitUntil: 'domcontentloaded' });
    const mobileAdd = page.getByRole('button', { name: 'افزودن به سبد خرید', exact: true }).last();
    await expect(mobileAdd).toBeEnabled({ timeout: 45000 });
    await mobileAdd.click();
    await expect(drawer).toBeVisible();
    await page.screenshot({ path: path.join(output, 'drawer-mobile.png') });
    await drawer.getByRole('button', { name: 'بستن سبد خرید', exact: true }).click();
    result.stage = 'complete'; result.desktop = 'passed'; result.mobile = 'passed';
    assert.deepEqual(errors, []);
  } catch (error) {
    result.failed = error.message;
    process.exitCode = 1;
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
  } finally {
    const cleanup = await context.request.post(base + '/api/cart/clear', { data: {} }).catch(() => null);
    result.cleanup = cleanup?.status();
    result.browser_errors = errors;
    fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
    process.exit(process.exitCode || 0);
  }
})();
