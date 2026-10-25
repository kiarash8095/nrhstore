// Explicit opt-in: these tests can mutate real carts/accounts or send SMS.
if (process.env.NRH_ALLOW_LIVE_MUTATIONS !== '1') {
  console.error('Live mutations are disabled. Set NRH_ALLOW_LIVE_MUTATIONS=1 only with authorization for a dedicated test environment.');
  process.exit(2);
}
/* eslint-disable @typescript-eslint/no-require-imports -- Explicit opt-in live OTP and cart verification. */
// Sends a real SMS only when AUTH_LIVE_TEST_PHONE is explicitly supplied.
// Codes/cookies stay in memory. No password reset, checkout, or payment is performed.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const base = process.env.AUTH_TEST_URL || 'http://localhost:3000';
const backend = process.env.WP_API_URL || 'https://nrhstore.ir/wp-json';
const phone = process.env.AUTH_LIVE_TEST_PHONE;
const jar = new Map();
const checks = [];
let originalCart, addedKey, authenticated = false;

async function call(endpoint, body, expected = 200, overrideCookie) {
  const response = await fetch(base + endpoint, {
    method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(45000),
    headers: { Origin: new URL(base).origin, Cookie: overrideCookie ?? [...jar].map(([name, value]) => name + '=' + value).join('; '), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const cookieHeaders = response.headers.getSetCookie();
  if (overrideCookie === undefined) for (const raw of cookieHeaders) {
    const pair = raw.split(';')[0], separator = pair.indexOf('=');
    const name = pair.slice(0, separator), value = pair.slice(separator + 1);
    if (!value || /max-age=0(?:;|$)/i.test(raw)) jar.delete(name); else jar.set(name, value);
  }
  const data = await response.json();
  assert.equal(response.status, expected, endpoint + ': HTTP ' + response.status + ' (' + (data.error?.code || data.code || 'invalid_response') + ')');
  return { data, cookieHeaders };
}
function passed(name) { checks.push(name); console.log('PASS: ' + name); }
function snapshot(cart) { return cart.items.map(item => ({ key: item.key, id: item.id, quantity: item.quantity })).sort((a,b) => a.key.localeCompare(b.key)); }

async function browserCheck() {
  const runtime = process.env.AUTH_PLAYWRIGHT_MODULE;
  if (!runtime) return;
  const { chromium } = require(runtime);
  const browser = await chromium.launch({ headless: true, channel: process.env.AUTH_BROWSER_CHANNEL || 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addCookies([...jar].map(([name,value]) => ({ name, value, url: base, httpOnly: true, sameSite: 'Lax', secure: new URL(base).protocol === 'https:' })));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/cart', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => document.querySelector('[data-testid="cart-item"]') || document.querySelector('main'), {}, { timeout: 45000 });
    const result = await context.request.get(base + '/api/cart');
    assert.equal(result.status(), 200);
    assert.ok((await result.json()).items.some(item => item.key === addedKey));
    await page.reload({ waitUntil: 'domcontentloaded' });
    const session = await context.request.get(base + '/api/auth/session');
    assert.equal(session.status(), 200);
    assert.ok((await context.cookies()).filter(cookie => cookie.name.startsWith('nrh_')).every(cookie => cookie.httpOnly));
    assert.deepEqual(errors, []);
    passed('Real browser retains HttpOnly authentication and cart cookies across reload');
    await context.close();
  } finally {
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  }
}

async function run() {
  assert.match(phone || '', /^09\d{9}$/, 'Set AUTH_LIVE_TEST_PHONE to a phone whose owner authorizes a real login SMS.');
  const challenge = await call('/api/auth/send-otp', { phone, purpose: 'login' });
  assert.equal(challenge.data.ok, true);
  passed('Real SMS request accepted by WordPress');
  const input = readline.createInterface({ input: stdin, output: stdout });
  let code;
  try { code = (await input.question('OTP code: ')).trim(); }
  finally { input.close(); }
  assert.match(code, /^\d{4}$/);
  const login = await call('/api/auth/verify-otp', { phone, code });
  code = undefined;
  assert.equal(login.data.status, 'authenticated');
  authenticated = true;
  const authCookie = login.cookieHeaders.find(cookie => cookie.startsWith('nrh_auth='));
  assert.ok(authCookie && /HttpOnly/i.test(authCookie) && /SameSite=Lax/i.test(authCookie));
  assert.ok(!/Domain=/i.test(authCookie));
  assert.ok(!JSON.stringify(login.data).includes('wordpress_logged_in'));
  passed('Real OTP verifies identity and issues an encrypted HttpOnly session cookie');
  const session = await call('/api/auth/session');
  assert.equal(session.data.session.user.id, login.data.session.user.id);
  assert.equal(session.cookieHeaders.length, 0);
  passed('A subsequent request authenticates against the real WordPress session');
  originalCart = (await call('/api/cart')).data;
  const productsResponse = await fetch(backend + '/wc/store/v1/products?per_page=100&stock_status=instock', { signal: AbortSignal.timeout(15000) });
  assert.equal(productsResponse.status, 200);
  const products = await productsResponse.json();
  const product = products.find(item => item.type === 'simple' && item.is_purchasable && item.is_in_stock && Number(item.prices.price) > 0 && !originalCart.items.some(row => row.id === item.id));
  assert.ok(product, 'A purchasable test item absent from the current account cart is required.');
  const added = (await call('/api/cart/add-item', { id: product.id, quantity: 1 })).data;
  addedKey = added.items.find(item => item.id === product.id)?.key;
  assert.ok(addedKey);
  assert.ok((await call('/api/cart')).data.items.some(item => item.key === addedKey));
  const token = [...jar].find(([name]) => name.startsWith('nrh_cart_user_'))?.[1];
  assert.ok(token, 'A verified customer must receive an account cart token.');
  const direct = await fetch(backend + '/wc/store/v1/cart?_nrh_request=' + randomUUID(), { headers: { 'Cart-Token': token, 'Cache-Control': 'no-cache, no-store' }, signal: AbortSignal.timeout(15000) }).then(response => response.json());
  assert.deepEqual(snapshot(direct), snapshot(added));
  assert.equal(direct.totals.total_price, added.totals.total_price);
  passed('Authenticated add, reload and totals match the real WooCommerce cart');
  await browserCheck();
  const cleaned = (await call('/api/cart/remove-item', { key: addedKey })).data;
  addedKey = undefined;
  assert.deepEqual(snapshot(cleaned), snapshot(originalCart));
  passed('Only the test item is removed; the original cart is preserved');
  const replay = [...jar].filter(([name]) => name === 'nrh_auth').map(([name,value]) => name + '=' + value).join('; ');
  await call('/api/auth/logout', {});
  authenticated = false;
  await call('/api/auth/session', undefined, 401);
  await call('/api/auth/session', undefined, 401, replay);
  passed('Logout revokes the real session and rejects a replayed cookie');
}

run().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (addedKey) {
    try { await call('/api/cart/remove-item', { key: addedKey }); addedKey = undefined; }
    catch { console.error('Test item cleanup failed; inspect the test account cart.'); }
  }
  if (authenticated) await call('/api/auth/logout', {}).catch(() => console.error('Test-session logout failed.'));
  const directory = path.resolve('artifacts/auth-cart');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'live-results.json'), JSON.stringify({ checks, passed: !process.exitCode, noPaymentPerformed: true, testItemCleaned: !addedKey }, null, 2));
  process.exit(process.exitCode || 0);
});
