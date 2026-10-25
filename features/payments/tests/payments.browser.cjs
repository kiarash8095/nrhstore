/* eslint-disable @typescript-eslint/no-require-imports -- Browser integration with intercepted APIs/bank. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const runtime = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(runtime);
const { expect: rawExpect } = require(runtime + '/test');
const expect = rawExpect.configure({ timeout: 30000 });
const origin = process.env.PAYMENTS_TEST_URL || 'http://localhost:4107';
const output = path.resolve(process.env.AUDIT_ARTIFACT_DIR || 'artifacts/payments'); fs.mkdirSync(output, { recursive: true });
const currency = { currency_code: 'IRT', currency_symbol: 'تومان', currency_minor_unit: 0, currency_decimal_separator: '.', currency_thousand_separator: ',', currency_prefix: '', currency_suffix: ' تومان' };
function fixture() {
  return {
    items: [{ id: 12, key: 'a'.repeat(32), name: 'کالای آزمایشی پرداخت', quantity: 1, quantity_limits: { minimum: 1, maximum: 4, multiple_of: 1, editable: true }, images: [], variation: [], item_data: [],
      prices: { ...currency, price: '250000', regular_price: '250000', sale_price: '250000', price_range: null },
      totals: { ...currency, line_total: '250000', line_subtotal: '250000', line_subtotal_tax: '0', line_total_tax: '0' }, permalink: 'https://cms.example.test/product/test/' }],
    items_count: 1, coupons: [], fees: [], errors: [], cross_sells: [], needs_shipping: true, needs_payment: true,
    billing_address: {}, shipping_address: {}, shipping_rates: [{ package_id: 0, name: 'ارسال آزمایشی', shipping_rates: [{ ...currency, rate_id: 'flat_rate:3', name: 'ارسال تستی', price: '0', selected: false }] }], payment_methods: ['melli_pay'], payment_requirements: [], extensions: {},
    totals: { ...currency, total_items: '250000', total_price: '250000', total_items_tax: '0', total_fees: '0', total_discount: '0', total_shipping: '0', total_tax: '0', tax_lines: [] },
  };
}
const fulfill = (route, data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'fa-IR' });
  const page = await context.newPage();
  const productSlug = process.env.PAYMENTS_TEST_PRODUCT_SLUG;
  let cart = productSlug ? { ...fixture(), items: [], items_count: 0 } : { ...fixture(), account_sync_pending: true };
  let authenticated = !productSlug, paid = false, writes = 0, adds = 0, logins = 0, bankVisits = 0, merges = 0, mergeMissing = false;
  const errors = [], results = {};
  page.on('pageerror', error => errors.push(error.message));
  await page.route(origin + '/api/**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname === '/api/auth/session') return authenticated ? fulfill(route, { status: 'authenticated', session: { user: { id: '7', phone: '', firstName: 'کاربر آزمایشی' } } }) : fulfill(route, { error: { code: 'session_expired', message: 'وارد حساب شوید.' } }, 401);
    if (url.pathname === '/api/auth/login') {
      assert.equal(request.method(), 'POST'); logins++; authenticated = true;
      cart = { ...cart, account_sync_pending: true };
      return fulfill(route, { status: 'authenticated', session: { user: { id: '7', phone: '', firstName: 'کاربر آزمایشی' } } });
    }
    if (url.pathname === '/api/cart/add-item') {
      assert.equal(request.headers()['x-nrh-cart-identity'], 'guest');
      const input = request.postDataJSON(); assert.ok(Number.isSafeInteger(input.id)); assert.equal(input.quantity, 1);
      adds++; cart = fixture(); return fulfill(route, cart);
    }
    if (url.pathname === '/api/cart/update-customer') {
      const body = request.postDataJSON(); cart = { ...cart, ...body }; return fulfill(route, cart);
    }
    if (url.pathname === '/api/cart/update-item') {
      const { quantity } = request.postDataJSON(); assert.ok([1, 2].includes(quantity));
      cart = { ...cart, items_count: quantity, items: cart.items.map(item => ({ ...item, quantity, totals: { ...item.totals, line_total: String(quantity * 250000), line_subtotal: String(quantity * 250000) } })), totals: { ...cart.totals, total_price: String(quantity * 250000), total_items: String(quantity * 250000) } };
      return fulfill(route, cart);
    }
    if (url.pathname === '/api/cart/apply-coupon') {
      const { code } = request.postDataJSON();
      if (code === 'BAD') return fulfill(route, { code: 'invalid_coupon', message: 'کد آزمایشی معتبر نیست.', data: { cart } }, 400);
      assert.equal(code, 'AUDIT'); cart = { ...cart, coupons: [{ code: 'AUDIT', discount_type: 'fixed_cart', totals: { ...currency, total_discount: '0', total_discount_tax: '0' } }] }; return fulfill(route, cart);
    }
    if (url.pathname === '/api/cart/remove-coupon') {
      assert.deepEqual(request.postDataJSON(), { code: 'AUDIT' }); cart = { ...cart, coupons: [] }; return fulfill(route, cart);
    }
    if (url.pathname === '/api/cart/select-shipping-rate') {
      assert.deepEqual(request.postDataJSON(), { package_id: 0, rate_id: 'flat_rate:3' });
      cart = { ...cart, shipping_rates: cart.shipping_rates.map(pack => ({ ...pack, shipping_rates: pack.shipping_rates.map(rate => ({ ...rate, selected: true })) })) }; return fulfill(route, cart);
    }
    if (url.pathname === '/api/cart/pay') {
      const body = request.postDataJSON();
      assert.match(body.cart_hash, /^[a-f0-9]{64}$/); assert.match(body.attempt_id, /^[a-f0-9-]{36}$/); assert.equal(body.expected_total, '250000');
      writes++; return fulfill(route, { order_id: 55, redirect_url: 'https://sadad.shaparak.ir/VPG/Purchase?Token=mock-bank-token-123' });
    }
    if (url.pathname === '/api/cart/sync') {
      assert.equal(request.method(), 'POST'); assert.equal(request.headers()['x-nrh-cart-identity'], '7');
      assert.deepEqual(request.postDataJSON(), {}); merges++;
      if (mergeMissing) return fulfill(route, { code: 'cart_bridge_missing', message: 'سرویس انتقال سبد فعال نیست. سبد شما محفوظ است.', data: { cart } }, 409);
      cart = { ...cart, account_sync_pending: false }; return fulfill(route, cart);
    }
    if (url.pathname === '/api/cart') return fulfill(route, cart);
    if (url.pathname === '/api/payments/55') return fulfill(route, { order_id: 55, status: paid ? 'processing' : 'pending', paid, payment_state: paid ? 'paid' : 'awaiting', reference: paid ? '12345678' : '' });
    if (url.pathname === '/api/banners') return fulfill(route, { banners: [] });
    return fulfill(route, []);
  });
  await page.route('https://sadad.shaparak.ir/**', async route => {
    bankVisits++; return route.fulfill({ contentType: 'text/html', body: '<h1>Intercepted bank destination</h1>' });
  });
  try {
    if (productSlug) {
      await page.goto(origin + '/products/' + productSlug, { waitUntil: 'domcontentloaded', timeout: 90000 });
      const add = page.getByRole('button', { name: 'افزودن به سبد خرید', exact: true }).first();
      await expect(add).toBeEnabled(); await add.click();
      await expect(page.getByTestId('cart-drawer')).toBeVisible();
      await expect(page.getByTestId('cart-item')).toHaveCount(1); assert.equal(adds, 1);
      await page.getByRole('link', { name: 'مشاهده و تکمیل سبد خرید' }).click();
      await expect(page.getByTestId('cart-drawer')).toBeHidden();
      await page.getByRole('button', { name: 'افزایش تعداد کالای آزمایشی پرداخت' }).click();
      await expect.poll(() => cart.items_count).toBe(2);
      await expect(page.getByRole('button', { name: 'کاهش تعداد کالای آزمایشی پرداخت' })).toBeEnabled();
      await page.getByRole('button', { name: 'کاهش تعداد کالای آزمایشی پرداخت' }).click();
      await expect.poll(() => cart.items_count).toBe(1);
      await page.getByPlaceholder('کد تخفیف', { exact: true }).fill('BAD');
      await page.getByRole('button', { name: 'اعمال', exact: true }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'کد آزمایشی معتبر نیست.' })).toBeVisible();
      await page.getByPlaceholder('کد تخفیف', { exact: true }).fill('AUDIT');
      await page.getByRole('button', { name: 'اعمال', exact: true }).click();
      await page.getByRole('button', { name: 'حذف کد AUDIT', exact: true }).click();
      await expect.poll(() => cart.coupons.length).toBe(0);
      results.cart_quantity_and_coupons = 'passed; increase/decrease, invalid coupon recovery, apply/remove coupon';
      await page.getByRole('link', { name: 'ادامه و تسویه‌حساب' }).click();
      await page.getByRole('button', { name: 'برای پرداخت وارد حساب شوید' }).click();
      await page.getByLabel('شماره موبایل، ایمیل یا نام کاربری', { exact: true }).fill('audit@example.invalid');
      await page.getByRole('button', { name: 'ادامه ورود', exact: true }).click();
      await page.getByLabel('رمز عبور', { exact: true }).fill('mock-test-password');
      await page.getByRole('button', { name: 'ورود به حساب', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0); assert.equal(logins, 1);
      results.product_to_cart_login = 'passed; real product page, one intercepted add, drawer/cart/checkout and intercepted password login';
    }
    await page.goto(origin + '/checkout', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await expect.poll(() => merges).toBe(1);
    results.guest_cart_transfer = 'passed; one explicit POST after authenticated cart read';
    const values = { first_name: 'کاربر', last_name: 'آزمایشی', phone: '09000000000', email: 'test@example.invalid', city: 'همدان', address_1: 'آدرس آزمایشی', postcode: '6511111111' };
    for (const [name, value] of Object.entries(values)) await page.locator('input[name="' + name + '"]').fill(value);
    await page.locator('select[name="state"]').selectOption('HDN');
    await page.getByRole('button', { name: 'ذخیره آدرس و محاسبه ارسال' }).click();
    const pay = page.getByRole('button', { name: 'پرداخت با سداد بانک ملی', exact: true });
    await expect(pay).toBeDisabled();
    await page.getByRole('radio', { name: /ارسال تستی/ }).click();
    await expect(page.getByRole('radio', { name: /ارسال تستی/ })).toBeChecked();
    await expect(pay).toBeEnabled();
    results.shipping_selection = 'passed; payment disabled until address save and explicit shipping choice';
    await page.screenshot({ path: path.join(output, 'checkout-desktop.png'), fullPage: true });
    await pay.dblclick();
    await page.waitForURL('https://sadad.shaparak.ir/VPG/Purchase?Token=mock-bank-token-123');
    assert.equal(writes, 1); assert.equal(bankVisits, 1); results.direct_redirect = 'passed; one request for double click, bank intercepted';
    await page.goto(origin + '/checkout/result?order=55&success=true', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('status').filter({ hasText: 'هنوز تأیید نشده' })).toBeVisible();
    assert.equal(await page.getByText('پرداخت سفارش تأیید شد.', { exact: true }).count(), 0);
    results.forged_success_url = 'ignored';
    paid = true;
    await page.getByRole('button', { name: 'بررسی دوباره وضعیت' }).click();
    await expect(page.getByText('پرداخت سفارش تأیید شد.', { exact: true })).toBeVisible();
    await expect(page.getByText('کد پیگیری: 12345678')).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(async () => {
      window.scrollTo(0, 0);
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: path.join(output, 'result-mobile.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    results.verified_result = 'passed';
    authenticated = false; cart = fixture();
    await page.goto(origin + '/checkout', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'برای پرداخت وارد حساب شوید' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'پرداخت با سداد بانک ملی', exact: true })).toBeDisabled();
    results.mandatory_login = 'passed';
    authenticated = true; mergeMissing = true; cart = { ...fixture(), account_sync_pending: true };
    await page.goto(origin + '/cart', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('alert').filter({ hasText: 'سبد شما محفوظ است' })).toBeVisible();
    await expect(page.getByText('کالای آزمایشی پرداخت', { exact: true }).first()).toBeVisible();
    mergeMissing = false;
    await page.getByRole('button', { name: 'تازه‌سازی سبد' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'سبد شما محفوظ است' })).toHaveCount(0);
    results.failed_transfer_recovery = 'passed; guest items stay visible and explicit refresh recovers';
    assert.deepEqual(errors, []);
    results.browser_errors = errors;
  } catch (error) {
    results.failure = error.message; results.browser_errors = errors; process.exitCode = 1;
    await page.screenshot({ path: path.join(output, 'browser-failure.png'), fullPage: true }).catch(() => {});
  } finally {
    fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(results, null, 2) + '\n');
    console.log(JSON.stringify(results, null, 2));
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  }
})().then(() => process.exit(process.exitCode || 0), error => { console.error(error); process.exit(1); });
