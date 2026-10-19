/* eslint-disable @typescript-eslint/no-require-imports -- Isolated audit of real route handlers. */
// No live accounts, published banners, or WooCommerce data are changed.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const load = require('../../features/auth/tests/auth-test-loader.cjs');
const { NextRequest } = require('next/server');
process.env.NODE_ENV = 'test';
process.env.AUTH_SESSION_SECRET = 'isolated-race-audit-secret-at-least-32-characters';
process.env.WP_API_URL = 'https://cms.example.test/wp-json';
const isolated = path.resolve('.next', 'race-audit-' + randomUUID());
process.env.BANNERS_DATA_DIR = path.join(isolated, 'banners');
process.env.CART_LOCK_DIR = path.join(isolated, 'cart-locks');
const auth = load('features/auth/server/backend/adapter.ts').authAdapter;
const cookies = load('features/auth/server/cookies.ts');
const { clearAllRateLimits } = load('lib/server/rate-limit.ts');
const session = load('features/auth/server/handlers/auth-session.ts');
const login = load('features/auth/server/handlers/auth-login.ts');
const cartHandlers = load('features/cart/server/handlers.ts');
const banners = load('features/banners/server/store.ts');
const original = { fetch: global.fetch, getSession: auth.getSession, login: auth.login };
const results = [];
const user = { id: '123', phone: '', firstName: 'کاربر آزمایشی' };
const request = (endpoint, body, cookie = '') => new NextRequest('http://shop.example.test' + endpoint, {
  method: body === undefined ? 'GET' : 'POST',
  headers: { Origin: 'http://shop.example.test', Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
function gate() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
function cart(count = 0) { return { items: count ? [{ id: 12, quantity: count, key: 'a'.repeat(32) }] : [], items_count: count, coupons: [], totals: { total_price: String(count * 100) }, errors: [] }; }
const json = (data, token) => Response.json(data, { headers: { 'Cart-Token': token } });
async function probe(id, run) {
  clearAllRateLimits();
  try { const evidence = await run(); results.push({ id, status: 'passed', evidence }); }
  catch (error) { results.push({ id, status: error.code === 'ERR_ASSERTION' ? 'race-confirmed' : 'test-error', message: error.message }); }
  finally { global.fetch = original.fetch; auth.getSession = original.getSession; auth.login = original.login; }
  console.log(results.at(-1).status.toUpperCase() + ': ' + id);
}
async function run() {
  await probe('AUTH-COOKIE: delayed guest session response must preserve a newer login cookie', async () => {
    const started = gate(), release = gate();
    auth.getSession = async () => { started.resolve(); await release.promise; return null; };
    const oldRead = session.GET(request('/api/auth/session'));
    await started.promise;
    auth.login = async () => ({ user, jar: { wordpress_logged_in_test: 'synthetic-new-session' } });
    const signedIn = await login.POST(request('/api/auth/login', { identifier: 'audit@example.invalid', password: 'synthetic-password' }));
    assert.equal(signedIn.status, 200);
    assert.ok(signedIn.cookies.get('nrh_auth')?.value);
    release.resolve();
    const lateResponse = await oldRead;
    assert.equal(lateResponse.status, 401);
    assert.equal(lateResponse.cookies.has('nrh_auth'), false,
      'A guest GET sent before login returns Set-Cookie nrh_auth=""; Max-Age=0 after the successful login response.');
  });
  await probe('AUTH-COOKIE-IDENTITY: delayed valid read must not restore the previous account cookie', async () => {
    const started = gate(), release = gate();
    const oldJar = cookies.decodeJar(cookies.encodeJar({ wordpress_logged_in_test: 'synthetic-account-A' }));
    auth.getSession = async () => { started.resolve(); await release.promise; return { user, jar: oldJar }; };
    const oldRead = session.GET(request('/api/auth/session', undefined, 'nrh_auth=' + cookies.encodeJar(oldJar)));
    await started.promise;
    auth.login = async () => ({ user: { ...user, id: '456' }, jar: { wordpress_logged_in_test: 'synthetic-account-B' } });
    const signedIn = await login.POST(request('/api/auth/login', { identifier: 'second@example.invalid', password: 'synthetic-password' }));
    assert.equal(cookies.decodeJar(signedIn.cookies.get('nrh_auth').value).wordpress_logged_in_test, 'synthetic-account-B');
    release.resolve();
    const lateResponse = await oldRead;
    assert.equal(lateResponse.cookies.has('nrh_auth'), false,
      'A valid GET for account A still rewrites its old authenticated cookie after a newer login to account B.');
  });
  await probe('CART-BOOTSTRAP: concurrent cookie-less read must not replace a cart containing the new item', async () => {
    const started = gate(), release = gate(); let bootstraps = 0;
    const readToken = 'audit-empty-cart-token-12345678901234567890';
    let writes = 0;
    global.fetch = async (_url, options) => {
      if (options.method === 'POST') { writes++; assert.equal(options.headers['Cart-Token'], readToken); return json(cart(1), readToken); }
      if (++bootstraps === 1) { started.resolve(); await release.promise; return json(cart(), readToken); }
      return json(cart(), readToken);
    };
    const oldRead = cartHandlers.getCartHandler(request('/api/cart'));
    await started.promise;
    const write = await cartHandlers.addItemHandler(request('/api/cart/add-item', { id: 12, quantity: 1 }));
    assert.equal(write.status, 409); assert.equal((await write.json()).code, 'cart_session_required');
    assert.equal(writes, 0); assert.equal(write.cookies.has('nrh_cart_guest'), false);
    release.resolve();
    const lateRead = await oldRead;
    assert.equal((await lateRead.json()).items_count, 0);
    const initializedCookie = 'nrh_cart_guest=' + lateRead.cookies.get('nrh_cart_guest').value;
    const accepted = await cartHandlers.addItemHandler(request('/api/cart/add-item', { id: 12, quantity: 1 }, initializedCookie));
    assert.equal(accepted.status, 200); assert.equal((await accepted.json()).items_count, 1);
    assert.equal(accepted.cookies.get('nrh_cart_guest').value, readToken);
    return 'A competing cookie-less write is rejected before WooCommerce; the initialized session is reused.';
  });
  await probe('CART-WRITES: overlapping requests must preserve both WooCommerce increments', async () => {
    let quantity = 1, active = 0, maximum = 0;
    global.fetch = async (_url, options) => {
      if (options.method !== 'POST') return json(cart(quantity), 'audit-existing-cart-token-1234567890');
      const next = quantity + 1; maximum = Math.max(maximum, ++active);
      await new Promise(resolve => setTimeout(resolve, 35));
      quantity = next; active--;
      return json(cart(quantity), 'audit-existing-cart-token-1234567890');
    };
    const cookie = 'nrh_cart_guest=audit-existing-cart-token-1234567890';
    const responses = await Promise.all([cartHandlers.addItemHandler(request('/api/cart/add-item', { id: 12, quantity: 1 }, cookie)), cartHandlers.addItemHandler(request('/api/cart/add-item', { id: 12, quantity: 1 }, cookie))]);
    assert.ok(responses.every(response => response.status === 200)); assert.equal(quantity, 3); assert.equal(maximum, 1);
    return { finalQuantity: quantity, maximumConcurrentUpstreamWrites: maximum };
  });
  await probe('BANNERS-SAVE: competing saves must accept exactly one revision', async () => {
    const current = await banners.readBannerDocument();
    const outcomes = await Promise.allSettled([banners.saveBannerDocument(current), banners.saveBannerDocument(current)]);
    assert.equal(outcomes.filter(item => item.status === 'fulfilled').length, 1);
    assert.equal(outcomes.filter(item => item.status === 'rejected' && item.reason instanceof banners.BannerConflictError).length, 1);
    const saved = await banners.readBannerDocument();
    assert.equal(saved.revision, outcomes.find(item => item.status === 'fulfilled').value.revision);
    return 'Exclusive file creation and revision check preserve the winning save; test data is isolated.';
  });
}
run().catch(error => results.push({ status: 'test-error', message: error.stack })).finally(async () => {
  global.fetch = original.fetch; auth.getSession = original.getSession; auth.login = original.login;
  // Delete only the exact temporary files this audit created, without recursive removal.
  for (const name of ['banners.json', 'save.lock']) await fs.unlink(path.join(isolated, 'banners', name)).catch(() => {});
  await fs.rmdir(path.join(isolated, 'banners')).catch(() => {});
  await fs.rmdir(path.join(isolated, 'cart-locks')).catch(() => {});
  await fs.rmdir(isolated).catch(() => {});
  const output = path.resolve(process.env.RACE_REPORT_DIR || 'artifacts/race-conditions'); await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'server-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  process.exitCode = results.some(item => item.status !== 'passed') ? 1 : 0;
});
