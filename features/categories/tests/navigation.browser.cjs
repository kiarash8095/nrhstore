/* eslint-disable @typescript-eslint/no-require-imports -- Read-only browser regression. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const runtime = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(runtime);
const { expect } = require(runtime + '/test');
const check = expect.configure({ timeout: 30000 });
const origin = process.env.CATEGORIES_TEST_URL || 'http://localhost:3000';
const mode = process.env.CATEGORIES_TEST_MODE || 'current';
const directory = path.resolve(process.env.AUDIT_ARTIFACT_DIR || 'artifacts/environment-parity');
const expected = [
  [55, 'laptop'], [365, 'computer-hardware'], [57, 'printers-scanners'],
  [58, 'network-equipment'], [59, 'accessories'],
];
const summary = { mode, origin, categories: [], browserErrors: [] };
let browser;
let lastPage;

async function expandMenu(page) {
  const button = page.getByRole('button', { name: 'دسته بندی ها', exact: true });
  await button.focus();
  await check.poll(async () => {
    if (await button.getAttribute('aria-expanded') !== 'true') await button.press('Enter');
    return button.getAttribute('aria-expanded');
  }).toBe('true');
}

async function open() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/api/auth/session', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'session_expired', message: 'Guest' } }) }));
  await context.route('**/api/cart', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  const page = await context.newPage();
  lastPage = page;
  page.on('pageerror', error => summary.browserErrors.push(error.message));
  page.setDefaultTimeout(30000);
  return { context, page };
}

(async () => {
  await fs.mkdir(directory, { recursive: true });
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const { context, page } = await open();
  const responses = new Map();
  page.on('response', async response => {
    const url = new URL(response.url());
    if (url.pathname === '/api/catalog/products/categories' && url.searchParams.has('parent')) {
      const parent = Number(url.searchParams.get('parent'));
      const data = await response.json().catch(() => null);
      responses.set(parent, { status: response.status(), data });
    }
  });
  await page.goto(origin + '/products', { waitUntil: 'domcontentloaded', timeout: 90000 });
  const menu = page.getByRole('navigation', { name: 'دسته‌بندی‌های اصلی' });
  await expandMenu(page);
  await check(menu.getByRole('link')).toHaveCount(5);
  assert.deepEqual(await menu.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href'))), expected.map(([, slug]) => '/products/category/' + slug));
  for (const [id, slug] of expected) {
    const link = menu.locator('a[href="/products/category/' + slug + '"]');
    await link.focus();
    await check.poll(() => responses.get(id)?.status).toBe(200);
    const data = responses.get(id).data;
    assert.ok(Array.isArray(data));
    for (const child of data) await check(page.locator('a[href="/products/category/' + child.slug + '"]').first()).toBeVisible();
    if (!data.length) await check(page.getByText('زیردسته‌ای برای این دسته بندی ثبت نشده است.')).toBeVisible();
    await check(link.locator('svg').first()).toBeVisible();
    summary.categories.push({ id, slug, name: (await link.textContent()).trim(), children: data.length });
  }
  await page.screenshot({ path: path.join(directory, mode + '-menu.png') });
  await page.goto(origin + '/products/category/network', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await check(page).toHaveURL(/\/products\/category\/network-equipment$/);
  await check(page.getByRole('heading', { level: 1 })).toHaveText('تجهیزات شبکه');
  summary.legacyRedirect = 'network -> network-equipment';
  await context.close();

  const failure = await open();
  let reject = true;
  await failure.context.route('**/api/catalog/products/categories?*', route => {
    if (new URL(route.request().url()).searchParams.get('parent') === '365' && reject) {
      return route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ message: 'Controlled upstream failure' }) });
    }
    return route.continue();
  });
  await failure.page.goto(origin + '/products', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await expandMenu(failure.page);
  await failure.page.getByRole('navigation', { name: 'دسته‌بندی‌های اصلی' }).locator('a[href$="/computer-hardware"]').focus();
  await check(failure.page.getByRole('alert').filter({ hasText: 'دریافت زیردسته‌ها انجام نشد.' })).toBeVisible();
  reject = false;
  await failure.page.getByRole('button', { name: 'تلاش دوباره', exact: true }).click();
  await check(failure.page.locator('a[href$="/pc-case"]').first()).toBeVisible();
  summary.errorRecovery = 'visible error, manual retry, real categories restored';
  await failure.context.close();
  assert.deepEqual(summary.browserErrors, []);
  await fs.writeFile(path.join(directory, mode + '-results.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
})().catch(async error => {
  summary.error = error.message;
  if (lastPage && !lastPage.isClosed()) {
    summary.debug = await lastPage.evaluate(() => ({ url: location.href, categories: document.querySelectorAll('nav[aria-label="دسته‌بندی‌های اصلی"] a').length, expanded: [...document.querySelectorAll('button[aria-expanded]')].map(button => [button.textContent, button.getAttribute('aria-expanded')]) })).catch(() => null);
    await lastPage.screenshot({ path: path.join(directory, mode + '-failure.png') }).catch(() => {});
  }
  await fs.writeFile(path.join(directory, mode + '-results.json'), JSON.stringify(summary, null, 2));
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => {
  // Some Windows browser helpers retain pipes after the assertions finish.
  // Bound cleanup and preserve the assertion result for standalone/CI runs.
  await Promise.race([browser?.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  process.exit(process.exitCode || 0);
});
