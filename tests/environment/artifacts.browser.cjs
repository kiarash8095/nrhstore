/* eslint-disable @typescript-eslint/no-require-imports -- Local dev watcher regression. */
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.WATCH_TEST_URL || 'http://127.0.0.1:4126';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  let armed = false;
  const updates = [], errors = [], reloads = [];
  const probe = path.resolve('artifacts/security-audit/watch-probe.txt');
  try {
    await page.route(origin + '/api/**', route => {
      const guest = new URL(route.request().url()).pathname === '/api/auth/session';
      return route.fulfill({ status: guest ? 401 : 200, contentType: 'application/json', body: JSON.stringify(guest
        ? { error: { code: 'session_expired', message: 'Guest test' } }
        : { items: [], items_count: 0, coupons: [], errors: [], totals: { total_price: '0' } }) });
    });
    page.on('pageerror', error => { if (armed) errors.push(error.message); });
    page.on('framenavigated', frame => { if (armed && frame === page.mainFrame()) reloads.push(frame.url()); });
    page.on('websocket', socket => socket.on('framereceived', ({ payload }) => {
      if (armed && /building|built|reloadPage|serverComponentChanges|\.css/.test(String(payload))) updates.push(String(payload).slice(0, 250));
    }));
    await page.goto(origin + '/checkout', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.getByRole('heading', { name: 'تسویه‌حساب', exact: true }).waitFor();
    await page.waitForTimeout(1500);
    armed = true;
    await fs.writeFile(probe, 'bg-[' + '#' + randomBytes(3).toString('hex') + ']\n');
    await page.waitForTimeout(4000);
    armed = false;
    // A no-op build notification is harmless; CSS/RSC updates or a reload are not.
    const changed = updates.some(message => /reloadPage|serverComponentChanges|\.css/.test(message));
    const result = { origin, updates, errors, reloads, passed: !changed && errors.length === 0 && reloads.length === 0 };
    console.log(JSON.stringify(result, null, 2));
    assert.equal(result.passed, true, 'Writing test artifacts changed styles, reloaded the page or caused a browser error.');
  } finally {
    await fs.unlink(probe).catch(() => {});
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  }
})().then(() => process.exit(0), error => { console.error(error); process.exit(1); });
