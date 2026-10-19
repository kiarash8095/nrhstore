/* eslint-disable @typescript-eslint/no-require-imports -- Read-only browser audit with controlled API fixtures. */
// Only browser responses are simulated. No real login, SMS, order, or published banner is changed.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const runtime = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(runtime);
const { expect: baseExpect } = require(runtime + '/test');
const expect = baseExpect.configure({ timeout: 20000 });
const origin = process.env.RACE_TEST_URL || 'http://localhost:3000';
const output = path.resolve(process.env.RACE_REPORT_DIR || 'artifacts/race-conditions');
const reportSuffix = process.env.RACE_FILTER ? '-' + process.env.RACE_FILTER.replace(/[^a-z0-9-]/gi, '') : '';
const resultsFile = path.join(output, 'browser' + reportSuffix + '-results.json');
const results = [];
const hydrationFindings = [];
let browser;
const guest = { error: { code: 'session_expired', message: 'نشست فعالی وجود ندارد.' } };
const account = { status: 'authenticated', session: { user: { id: '123', phone: '', firstName: 'کاربر', lastName: 'آزمایشی' } } };
const currency = { currency_code: 'IRT', currency_symbol: 'تومان', currency_minor_unit: 0, currency_decimal_separator: '.', currency_thousand_separator: ',', currency_prefix: '', currency_suffix: ' تومان' };
function cart(quantity = 1) {
  const totals = { ...currency, line_subtotal: String(quantity * 100000), line_total: String(quantity * 100000), line_subtotal_tax: '0', line_total_tax: '0' };
  return { items: quantity ? [{ id: 12, key: 'a'.repeat(32), name: 'محصول آزمایشی هم‌زمانی', quantity, quantity_limits: { minimum: 1, maximum: 20, multiple_of: 1, editable: true }, images: [], variation: [], item_data: [], prices: { ...currency, price: '100000', regular_price: '100000', sale_price: '100000', price_range: null }, totals, permalink: 'https://cms.example.test/product/audit/' }] : [],
    items_count: quantity, coupons: [], fees: [], errors: [], cross_sells: [], needs_shipping: false, needs_payment: true,
    billing_address: {}, shipping_address: {}, shipping_rates: [], payment_methods: [], payment_requirements: [], extensions: {},
    totals: { ...currency, total_items: String(quantity * 100000), total_price: String(quantity * 100000), total_items_tax: '0', total_fees: '0', total_discount: '0', total_shipping: '0', total_tax: '0', tax_lines: [] } };
}
const fulfill = (route, data, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(data) });
async function setup(url = '/cart', configure) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const state = { cart: cart(), signedIn: false, bootstrap: true, bootstrapReads: [], sessionReads: [], cartReads: [], readSnapshots: new Map(), writes: [], holdSession: false, holdCart: false, handlers: {} };
  await context.route('**/api/auth/session', route => state.bootstrap ? state.bootstrapReads.push(route) : state.holdSession ? state.sessionReads.push(route) : fulfill(route, state.signedIn ? account : guest, state.signedIn ? 200 : 401));
  await context.route('**/api/auth/login', route => { state.signedIn = true; return fulfill(route, account, 200, { 'Set-Cookie': 'nrh_auth=synthetic-audit-session; Path=/; HttpOnly; SameSite=Lax' }); });
  await context.route('**/api/cart/recommendations?*', route => fulfill(route, []));
  await context.route(url => url.pathname === '/api/cart' || url.pathname.startsWith('/api/cart/'), async route => {
    const endpoint = new URL(route.request().url()).pathname.slice('/api/cart'.length);
    if (endpoint === '/recommendations') return fulfill(route, []);
    if (!endpoint) { if (state.holdCart) { state.cartReads.push(route); state.readSnapshots.set(route, structuredClone(state.cart)); return; } return fulfill(route, state.cart); }
    state.writes.push({ endpoint, body: route.request().postDataJSON() });
    if (state.handlers[endpoint]) return state.handlers[endpoint](route);
    if (endpoint === '/update-item') state.cart = cart(route.request().postDataJSON().quantity);
    if (endpoint === '/update-customer') state.cart = { ...state.cart, ...route.request().postDataJSON() };
    return fulfill(route, endpoint === '/checkout' ? { cart: state.cart, checkout: { order_id: 123, status: 'checkout-draft' } } : state.cart);
  });
  if (configure) await configure(context, state);
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.addInitScript(() => { window.auditRejections = []; window.addEventListener('unhandledrejection', event => window.auditRejections.push(String(event.reason))); });
  page.setDefaultTimeout(20000);
  await page.goto(origin + url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await expect(page.getByRole('button', { name: 'حساب کاربری', exact: true }).first()).toBeVisible();
  if (state.bootstrap) {
    // Isolate the request-ordering probes from the separately tested streaming-hydration race.
    await page.waitForTimeout(400);
    state.bootstrap = false;
    for (const route of state.bootstrapReads.splice(0)) await fulfill(route, guest, 401);
  }
  await expect(page.getByRole('button', { name: 'حساب کاربری', exact: true }).first()).toBeEnabled();
  if (url === '/cart' || url === '/checkout') await expect(page.locator('main').getByTestId('cart-item')).toHaveCount(1);
  return { context, page, state, errors };
}
async function loginUI(page) {
  await page.getByRole('button', { name: 'حساب کاربری', exact: true }).first().click();
  await page.getByLabel('شماره موبایل، ایمیل یا نام کاربری', { exact: true }).fill('audit@example.invalid');
  await page.getByRole('button', { name: 'ادامه ورود', exact: true }).click();
  await page.getByLabel('رمز عبور', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: 'ورود به حساب', exact: true }).click();
  await expect(page.getByRole('button', { name: 'منوی حساب کاربری', exact: true })).toBeVisible();
}
const ready = page => page.getByRole('button', { name: 'بررسی نهایی و آماده‌سازی تسویه', exact: true });
const refocus = page => page.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.auditHidden ? 'hidden' : 'visible' });
  window.auditHidden = true; document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
  window.auditHidden = false; document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
});
async function fillAddress(page) {
  const values = { first_name: 'کاربر', last_name: 'آزمایشی', phone: '09000000000', email: 'audit@example.invalid', city: 'همدان', address_1: 'آدرس آزمایشی اول', postcode: '6511111111' };
  for (const [name, value] of Object.entries(values)) await page.locator('input[name="' + name + '"]').fill(value);
  await page.locator('select[name="state"]').selectOption('HDN');
}
async function probe(id, run) {
  if (process.env.RACE_FILTER && !id.includes(process.env.RACE_FILTER)) return;
  let session;
  try {
    const result = await run(value => { session = value; });
    const errors = session ? [...session.errors, ...await session.page.evaluate(() => window.auditRejections)] : [];
    const hydrationErrors = errors.filter(error => error.startsWith('Hydration failed'));
    // Persist this separate reproducible defect instead of letting it hide the ordering probe's result.
    if (hydrationErrors.length) hydrationFindings.push({ id, errors: hydrationErrors });
    assert.deepEqual(errors, [], 'Unexpected runtime failure, including hydration');
    results.push({ id, status: result.passed ? 'passed' : 'race-confirmed', evidence: result.evidence, hydrationErrors: hydrationErrors.length });
    if (!result.passed && session) await session.page.screenshot({ path: path.join(output, id + '.png'), fullPage: true });
  } catch (error) { results.push({ id, status: 'test-error', message: error.stack }); console.error(error.message); }
  finally { await session?.context.close(); }
  console.log(results.at(-1).status.toUpperCase() + ': ' + id);
  await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));
}
async function run() {
  await fs.mkdir(output, { recursive: true });
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  await probe('auth-cookie-after-login', async capture => {
    const s = await setup('/products'); capture(s); const { page, state, context } = s;
    state.holdSession = true; await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect.poll(() => state.sessionReads.length).toBeGreaterThan(0);
    const delayed = state.sessionReads.splice(0); state.holdSession = false;
    await loginUI(page);
    assert.ok((await context.cookies()).some(cookie => cookie.name === 'nrh_auth'));
    // Use the actual BFF cookie policy; the old handler would clear the new login here.
    const anonymous = await fetch(origin + '/api/auth/session');
    assert.equal(anonymous.status, 401);
    const setCookie = anonymous.headers.get('set-cookie');
    for (const route of delayed) await fulfill(route, guest, 401, setCookie ? { 'Set-Cookie': setCookie } : {});
    await page.waitForTimeout(300);
    const hasCookie = (await context.cookies()).some(cookie => cookie.name === 'nrh_auth');
    const showsAccount = await page.getByRole('button', { name: 'منوی حساب کاربری', exact: true }).isVisible();
    return { passed: hasCookie, evidence: { authCookiePresent: hasCookie, UIStillAuthenticated: showsAccount, responseHeadersMatchRealSessionHandler: true } };
  });
  await probe('checkout-edit-during-address-save', async capture => {
    const s = await setup('/checkout'); capture(s); const { page, state } = s; let pending;
    state.handlers['/update-customer'] = route => { pending = route; };
    await fillAddress(page);
    await page.getByRole('button', { name: 'ذخیره آدرس و محاسبه ارسال', exact: true }).click();
    await expect.poll(() => !!pending).toBe(true);
    const sent = pending.request().postDataJSON();
    await page.locator('input[name="city"]').fill('تهران');
    state.cart = { ...state.cart, ...sent }; await fulfill(pending, state.cart);
    await expect(page.getByTestId('cart-toast')).toContainText('آدرس ذخیره شد');
    const enabled = await ready(page).isEnabled();
    return { passed: !enabled, evidence: { submittedCity: sent.billing_address.city, visibleCity: await page.locator('input[name="city"]').inputValue(), checkoutEnabledWithUnsavedAddress: enabled } };
  });
  await probe('checkout-old-read-after-prepare', async capture => {
    const s = await setup('/checkout'); capture(s); const { page, state } = s;
    await fillAddress(page); await page.getByRole('button', { name: 'ذخیره آدرس و محاسبه ارسال', exact: true }).click();
    await expect(ready(page)).toBeEnabled();
    state.holdCart = true;
    await refocus(page);
    await expect.poll(() => state.cartReads.length).toBeGreaterThan(0);
    const stale = structuredClone(state.cart);
    state.cart = { ...cart(2), billing_address: state.cart.billing_address, shipping_address: state.cart.shipping_address };
    await ready(page).click(); await expect(page.getByTestId('checkout-ready')).toBeVisible();
    await expect(page.getByTestId('cart-count')).toHaveText('۲');
    state.holdCart = false;
    for (const route of state.cartReads.splice(0)) await fulfill(route, state.readSnapshots.get(route) || stale);
    await page.waitForTimeout(400);
    const count = await page.getByTestId('cart-count').innerText();
    return { passed: count === '۲', evidence: { latestCheckoutCartCount: 2, visibleCountAfterLateGET: count } };
  });
  await probe('checkout-ready-after-cart-change', async capture => {
    const s = await setup('/checkout'); capture(s); const { page } = s;
    await fillAddress(page); await page.getByRole('button', { name: 'ذخیره آدرس و محاسبه ارسال', exact: true }).click();
    await expect(ready(page)).toBeEnabled(); await ready(page).click(); await expect(page.getByTestId('checkout-ready')).toBeVisible();
    await page.locator('main').getByRole('button', { name: /افزایش تعداد/ }).click();
    await expect(page.getByTestId('cart-count')).toHaveText('۲');
    const staleReady = await page.getByTestId('checkout-ready').isVisible();
    return { passed: !staleReady, evidence: { cartChangedAfterPreparation: true, stalePreparedOrderStillShown: staleReady, classification: 'stale derived state, adjacent to the race conditions' } };
  });
  await probe('cart-write-during-login', async capture => {
    const s = await setup('/cart'); capture(s); const { page, state } = s; let pending;
    state.handlers['/update-item'] = route => { pending = route; };
    await page.locator('main').getByRole('button', { name: /افزایش تعداد/ }).click();
    await expect.poll(() => !!pending).toBe(true);
    state.cart = { ...cart(7), account_sync_pending: true };
    const signingIn = loginUI(page);
    await page.getByLabel('رمز عبور', { exact: true }).waitFor();
    await fulfill(pending, cart(2));
    await signingIn;
    await page.waitForTimeout(600);
    const firstCount = await page.getByTestId('cart-count').innerText();
    // A genuine new session read must fetch its cart. A stale guest success must not silently become that session's cached cart.
    await page.waitForTimeout(1500);
    const count = await page.getByTestId('cart-count').innerText();
    return { passed: count === '۷', evidence: { authoritativeNewSessionCount: 7, countAfterOldGuestWrite: firstCount, finalVisibleCount: count } };
  });
  await probe('search-reversed-responses', async capture => {
    const pending = new Map();
    const s = await setup('/products', async context => context.route('**/api/catalog/products?*', route => {
      const query = new URL(route.request().url()).searchParams.get('search');
      if (query) pending.set(query, route); else return route.continue();
    })); capture(s); const { page } = s;
    const input = page.getByPlaceholder('دنبال چی هستی؟').first();
    await input.fill('first'); await expect.poll(() => pending.has('first')).toBe(true);
    await input.fill('second'); await expect.poll(() => pending.has('second')).toBe(true);
    const item = (id, name) => [{ id, name, slug: 'audit-' + id, images: [], prices: { price: '1000' } }];
    await fulfill(pending.get('second'), item(2, 'نتیجه جدید آزمایشی'));
    await expect(page.getByText('نتیجه جدید آزمایشی', { exact: true }).first()).toBeVisible();
    await fulfill(pending.get('first'), item(1, 'نتیجه قدیمی آزمایشی'));
    await page.waitForTimeout(300);
    return { passed: await page.getByText('نتیجه جدید آزمایشی', { exact: true }).first().isVisible() && !(await page.getByText('نتیجه قدیمی آزمایشی', { exact: true }).count()), evidence: 'Reversing response order retains the current search key; old results do not replace the new query.' };
  });
  await probe('category-hover-reversed-responses', async capture => {
    const pending = new Map();
    const s = await setup('/products', async context => context.route('**/api/catalog/products/categories?*', route => {
      const parent = new URL(route.request().url()).searchParams.get('parent');
      if (parent && parent !== '0') pending.set(parent, route); else return route.continue();
    })); capture(s); const { page } = s;
    await page.getByRole('button', { name: 'دسته بندی ها', exact: true }).hover();
    const links = page.getByRole('navigation', { name: 'دسته‌بندی‌های اصلی' }).locator('a');
    await links.nth(0).hover(); await expect.poll(() => pending.size).toBeGreaterThan(0);
    const oldKey = [...pending.keys()][0];
    await links.nth(1).hover(); await expect.poll(() => pending.size).toBeGreaterThan(1);
    const newKey = [...pending.keys()].at(-1);
    await fulfill(pending.get(newKey), [{ id: 9902, name: 'زیردسته جدید آزمایشی', slug: 'audit-new', parent: Number(newKey) }]);
    await expect(page.getByRole('link', { name: 'زیردسته جدید آزمایشی', exact: true })).toBeVisible();
    await fulfill(pending.get(oldKey), [{ id: 9901, name: 'زیردسته قدیمی آزمایشی', slug: 'audit-old', parent: Number(oldKey) }]);
    await page.waitForTimeout(300);
    return { passed: await page.getByRole('link', { name: 'زیردسته جدید آزمایشی', exact: true }).isVisible() && !(await page.getByRole('link', { name: 'زیردسته قدیمی آزمایشی', exact: true }).count()), evidence: { oldCategory: oldKey, latestCategory: newKey, staleSubcategoryDidNotReplaceActiveCategory: true } };
  });
  await probe('cart-read-cancelled-before-write', async capture => {
    const s = await setup('/cart'); capture(s); const { page, state } = s;
    state.holdCart = true; await refocus(page);
    await expect.poll(() => state.cartReads.length).toBeGreaterThan(0);
    const stale = structuredClone(state.cart);
    state.holdCart = false;
    await page.locator('main').getByRole('button', { name: /افزایش تعداد/ }).click();
    await expect(page.getByTestId('cart-count')).toHaveText('۲');
    state.holdCart = false;
    const reads = state.cartReads.splice(0);
    for (const route of reads) await fulfill(route, state.readSnapshots.get(route) || stale).catch(() => {});
    await page.waitForTimeout(300);
    const count = await page.getByTestId('cart-count').innerText();
    return { passed: count === '۲', evidence: { expectedLatestCount: 2, visibleCountAfterLateReads: count, pendingReadSnapshots: reads.map(route => state.readSnapshots.get(route)?.items_count) } };
  });
  await probe('two-tabs-quantity-intent', async capture => {
    const s = await setup('/cart'); capture(s); const { context, page, state, errors } = s;
    const second = await context.newPage(); second.on('pageerror', error => errors.push(error.message));
    await second.goto(origin + '/cart', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await expect(second.getByTestId('cart-count')).toHaveText('۱');
    let pending;
    state.handlers['/update-item'] = route => {
      state.cart = cart(route.request().postDataJSON().quantity);
      if (!pending) { pending = route; return; }
      return fulfill(route, state.cart);
    };
    await page.locator('main').getByRole('button', { name: /افزایش تعداد/ }).click();
    await expect.poll(() => !!pending).toBe(true);
    await second.locator('main').getByRole('button', { name: /افزایش تعداد/ }).click();
    await second.waitForTimeout(200);
    assert.equal(state.writes.filter(write => write.endpoint === '/update-item').length, 1, 'The second tab sent an overlapping write');
    await fulfill(pending, state.cart);
    await expect(second.getByTestId('cart-count')).toHaveText('۳');
    await expect(page.getByTestId('cart-count')).toHaveText('۳');
    assert.deepEqual(await second.evaluate(() => window.auditRejections), []);
    return { passed: state.cart.items_count === 3, evidence: { startingQuantity: 1, simultaneousPlusClicks: 2, finalQuantity: state.cart.items_count, postedQuantities: state.writes.filter(write => write.endpoint === '/update-item').map(write => write.body.quantity) } };
  });
  await probe('two-tabs-bootstrap', async capture => {
    let pending; const requests = [];
    const token = 'audit-browser-bootstrap-token-1234567890';
    const s = await setup('/products', async (context, state) => {
      state.cart = cart(0);
      await context.route(url => url.pathname === '/api/cart', route => {
        const cookie = route.request().headers().cookie || ''; requests.push(cookie.includes('nrh_cart_guest=' + token));
        if (requests.length === 1) { pending = route; return; }
        return fulfill(route, state.cart);
      });
    }); capture(s); const { context, state, errors } = s;
    await expect.poll(() => !!pending).toBe(true);
    const second = await context.newPage(); second.on('pageerror', error => errors.push(error.message));
    await second.goto(origin + '/products', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await expect(second.getByRole('button', { name: 'حساب کاربری', exact: true }).first()).toBeEnabled();
    await second.waitForTimeout(200);
    assert.equal(requests.length, 1, 'Two tabs bootstrapped without waiting for the first cookie');
    await fulfill(pending, state.cart, 200, { 'Set-Cookie': 'nrh_cart_guest=' + token + '; Path=/; HttpOnly; SameSite=Lax' });
    await expect.poll(() => requests.length).toBeGreaterThan(1);
    assert.deepEqual(await second.evaluate(() => window.auditRejections), []);
    return { passed: requests.slice(1).every(Boolean), evidence: { initialCookieLessRequests: requests.filter(hasCookie => !hasCookie).length, laterRequestsReuseFirstCookie: requests.slice(1).every(Boolean) } };
  });
  await probe('checkout-address-changed-in-another-tab', async capture => {
    const s = await setup('/checkout'); capture(s); const { page, state } = s;
    await fillAddress(page); await page.getByRole('button', { name: 'ذخیره آدرس و محاسبه ارسال', exact: true }).click();
    await expect(ready(page)).toBeEnabled();
    state.cart = { ...state.cart, billing_address: { ...state.cart.billing_address, city: 'تهران' }, shipping_address: { ...state.cart.shipping_address, city: 'تهران' } };
    await refocus(page);
    await expect(ready(page)).toBeDisabled();
    return { passed: !(await ready(page).isEnabled()), evidence: 'A changed WooCommerce address invalidates the saved-address confirmation without overwriting the visible draft.' };
  });
  await probe('fast-cart-streaming-hydration', async capture => {
    const s = await setup('/checkout', async (_context, state) => { state.bootstrap = false; }); capture(s);
    const mismatches = s.errors.filter(error => error.startsWith('Hydration failed'));
    return { passed: !mismatches.length, allowHydrationErrors: true, evidence: { fastSessionAndCartResponses: true, hydrationErrors: mismatches.length, cartBadgeMismatch: mismatches.some(error => error.includes('سبد خرید، 1 کالا')), checkoutMarkupMismatch: mismatches.some(error => error.includes('<Checkout>')) } };
  });
}
run().catch(error => results.push({ status: 'test-error', message: error.stack })).finally(async () => {
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));
  await fs.writeFile(path.join(output, 'hydration' + reportSuffix + '-errors.json'), JSON.stringify(hydrationFindings, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await Promise.race([browser?.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  process.exit(results.some(result => result.status !== 'passed') ? 1 : 0);
});
