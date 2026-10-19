/* eslint-disable @typescript-eslint/no-require-imports -- Public route smoke audit; no mutations. */
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.RACE_TEST_URL || 'http://localhost:3000';
const results = [];
let browser;
async function run() {
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const routes = ['/', '/products', '/categories', '/products/category/laptop', '/cart', '/checkout', '/contact-us', '/dashboard', '/banners-admin', '/banners-admin/login', '/this-route-must-not-exist-audit'];
  for (const route of routes) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      const response = await page.goto(origin + route, { waitUntil: 'load', timeout: 90000 });
      if (route === '/banners-admin') await page.waitForURL('**/banners-admin/login', { waitUntil: 'load', timeout: 45000 });
      if (route === '/dashboard') await page.waitForURL(url => url.pathname === '/' && url.searchParams.get('auth') === 'login', { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(700);
      const status = response.status();
      results.push({ route, finalPath: new URL(page.url()).pathname, status, h1: await page.locator('h1').allTextContents(), runtimeErrors: errors, passed: !errors.length && status === (route.includes('must-not-exist') ? 404 : 200) });
    } catch (error) { results.push({ route, passed: false, error: error.message, runtimeErrors: errors }); }
    finally { await context.close(); }
    console.log(JSON.stringify(results.at(-1)));
  }
}
run().catch(error => results.push({ passed: false, error: error.message })).finally(async () => {
  const directory = path.resolve(process.env.RACE_REPORT_DIR || 'artifacts/race-conditions'); await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'routes-results.json'), JSON.stringify(results, null, 2));
  await Promise.race([browser?.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  process.exit(results.some(item => !item.passed) ? 1 : 0);
});
