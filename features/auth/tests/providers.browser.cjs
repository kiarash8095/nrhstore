/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser regression test. */
// Uses browser-only response fixtures; no accounts, banners, or store data are changed.
const assert = require('node:assert/strict');
const playwrightModule = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(playwrightModule);
const { expect } = require(playwrightModule + '/test');
const origin = process.env.PROVIDERS_TEST_URL || 'http://localhost:3000';
const check = expect.configure({ timeout: 45000 });
const guest = { error: { code: 'session_expired', message: 'نشست منقضی شده است.' } };
const signedIn = { status: 'authenticated', session: { user: { id: '123', phone: '09123456789', firstName: 'تست', lastName: 'نشست' } } };
let browser;

async function watch(context) {
  await context.addInitScript(() => {
    window.providerErrors = { unhandled: [], aborts: [] };
    window.addEventListener('unhandledrejection', event => window.providerErrors.unhandled.push(String(event.reason)));
    const abort = AbortController.prototype.abort;
    AbortController.prototype.abort = function (...args) {
      window.providerErrors.aborts.push(new Error().stack);
      return abort.apply(this, args);
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(45000);
  return { page, errors };
}

async function verifyErrors(page, errors) {
  const result = await page.evaluate(() => window.providerErrors);
  assert.deepEqual(errors, [], 'Unexpected browser runtime error');
  assert.deepEqual(result.unhandled, [], 'Unhandled promise rejection');
  assert.deepEqual(result.aborts.filter(stack => /AuthProvider|HomeBannersProvider/.test(stack)), [], 'Provider manually aborted a read');
}

const fulfill = (route, data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
const focus = page => page.evaluate(() => window.dispatchEvent(new Event('focus')));

async function authOrdering() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const { page, errors } = await watch(context);
  const pending = [];
  await page.route('**/api/auth/session', route => { pending.push(route); });
  await page.goto(origin + '/products', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await check.poll(() => pending.length).toBeGreaterThan(0);
  let count = pending.length;
  await focus(page);
  await check.poll(() => pending.length).toBeGreaterThan(count);
  const superseded = pending.at(-1);
  count = pending.length;
  await focus(page);
  await check.poll(() => pending.length).toBeGreaterThan(count);
  const latest = pending.at(-1);

  // A stale 401 must not turn an unresolved, newer session check into a guest.
  await fulfill(superseded, guest, 401);
  await check(page.getByRole('button', { name: 'حساب کاربری', exact: true }).first()).toBeDisabled();
  await fulfill(latest, signedIn);
  await check(page.getByRole('button', { name: 'منوی حساب کاربری', exact: true })).toBeVisible();
  for (const route of pending) {
    if (route !== latest && route !== superseded) await fulfill(route, guest, 401);
  }
  await page.waitForTimeout(300);
  await check(page.getByRole('button', { name: 'منوی حساب کاربری', exact: true })).toBeVisible();
  await verifyErrors(page, errors);
  await context.close();
  console.log('PASS: overlapping session reads ignore stale 401 responses and preserve the latest session');
}

async function bannerLifecycle() {
  const response = await fetch(origin + '/api/banners');
  assert.equal(response.status, 200);
  const document = await response.json();
  assert.ok(document.banners.length, 'The home page needs at least one configured banner');
  const updated = { ...document, revision: 'provider-browser-regression', banners: document.banners.map((banner, index) => index ? banner : { ...banner, title: 'بنر تست چرخه عمر' }) };
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const { page, errors } = await watch(context);
  await page.route('**/api/auth/session', route => fulfill(route, guest, 401));
  const pending = [];
  await page.route('**/api/banners', route => { pending.push(route); });
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await check.poll(() => pending.length).toBeGreaterThan(0);
  await page.locator('[data-slot="carousel"]').first().waitFor();
  const count = pending.length;
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  await page.waitForTimeout(300);
  assert.equal(pending.length, count, 'Banner reads overlap');
  for (const route of pending) await fulfill(route, updated);
  await check(page.getByRole('img', { name: 'بنر تست چرخه عمر', exact: true }).first()).toBeVisible();

  // A temporary failure keeps existing banners and a later refresh can recover.
  await focus(page);
  await check.poll(() => pending.length).toBeGreaterThan(count);
  await fulfill(pending.at(-1), { error: 'temporary failure' }, 503);
  await check(page.getByRole('img', { name: 'بنر تست چرخه عمر', exact: true }).first()).toBeVisible();
  const beforeLeave = pending.length;
  await focus(page);
  await check.poll(() => pending.length).toBeGreaterThan(beforeLeave);
  const outstanding = pending.at(-1);
  await page.getByRole('link', { name: 'فروشگاه', exact: true }).first().click();
  await page.waitForURL(origin + '/products');
  await fulfill(outstanding, document);
  const afterLeave = pending.length;
  await focus(page);
  await page.waitForTimeout(300);
  assert.equal(pending.length, afterLeave, 'An unmounted banner provider started another refresh');
  await verifyErrors(page, errors);
  await context.close();
  console.log('PASS: banner refreshes coalesce, retain visible data on failure, and ignore late responses after navigation');
}

(async () => {
  browser = await chromium.launch({ channel: process.env.PROVIDERS_BROWSER_CHANNEL || 'msedge', headless: true });
  await authOrdering();
  await bannerLifecycle();
})().then(() => process.exitCode = 0, error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await Promise.race([browser?.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  process.exit(process.exitCode || 0);
});
