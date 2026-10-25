/* eslint-disable @typescript-eslint/no-require-imports -- Isolated server integration tests. */
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const load = require('../../auth/tests/auth-test-loader.cjs');
const { NextRequest } = require('next/server');
const { payHandler } = load('features/cart/server/handlers.ts');
const { addItemHandler } = load('features/cart/server/handlers.ts');
const { paymentStatusHandler } = load('features/payments/server/handlers.ts');
const { checkoutSnapshot, allowedPaymentRedirect } = load('features/cart/utils/checkout.ts');
const { encodeJar } = load('features/auth/server/cookies.ts');
const auth = load('features/auth/server/backend/adapter.ts').authAdapter;
const { clearAllRateLimits } = load('lib/server/rate-limit.ts');
const oldFetch = global.fetch, oldSession = auth.getSession;
const TOKEN = 'account-cart-token-12345678901234567890';
const ATTEMPT = '01234567-89ab-4cde-8fab-0123456789ab';
const BANK = 'https://sadad.shaparak.ir/VPG/Purchase?Token=bank-token-1234567890';
process.env.WP_API_URL = 'https://cms.example.test/wp-json';
process.env.AUTH_SESSION_SECRET = 'payment-tests-session-secret-more-than-32-characters';

function cart() {
  return {
    items: [{ key: 'a'.repeat(32), id: 12, quantity: 1, totals: { line_total: '250000' } }],
    items_count: 1, coupons: [], fees: [], totals: { total_price: '250000', currency_code: 'IRT', currency_minor_unit: 0 },
    errors: [], billing_address: { country: 'IR', city: 'همدان', email: 'customer@example.test' }, shipping_address: { country: 'IR', city: 'همدان' },
    shipping_rates: [], needs_shipping: false, needs_payment: true, payment_methods: ['melli_pay'],
  };
}
function input(value = cart()) { return { attempt_id: ATTEMPT, expected_total: value.totals.total_price, cart_hash: createHash('sha256').update(checkoutSnapshot(value)).digest('hex') }; }
function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cart-Token': TOKEN, Nonce: 'abcdef1234', 'User-ID': '7', ...headers } }); }
function request(path, body, extra = {}) {
  return new NextRequest('https://shop.example.test' + path, {
    method: body === undefined ? 'GET' : 'POST', headers: {
      Origin: 'https://shop.example.test', Cookie: 'nrh_auth=' + encodeJar({ wordpress_logged_in_test: 'session' }) + '; nrh_cart_user_7=' + TOKEN,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...extra,
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function upstream(value = cart(), redirect = BANK) {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return String(url).includes('/nrh/v1/checkout') ? json({ order_id: 55, redirect_url: redirect }) : json(value);
  };
  return calls;
}
const status = { order_id: 55, status: 'pending', paid: false, payment_state: 'awaiting', reference: '' };
const context = { params: Promise.resolve({ id: '55' }) };
beforeEach(() => {
  clearAllRateLimits();
  auth.getSession = async () => ({ user: { id: '7' }, jar: { wordpress_logged_in_test: 'verified', wp_rest: '1234567890' } });
});
afterEach(() => { global.fetch = oldFetch; auth.getSession = oldSession; });

test('payment requires a verified account before reaching WooCommerce', async () => {
  auth.getSession = async () => null;
  global.fetch = async () => { throw new Error('Must not call upstream'); };
  assert.equal((await payHandler(request('/api/cart/pay', input()))).status, 401);
});
test('CSRF, extra fields, malformed UUID and oversized bodies never start payment', async () => {
  const calls = upstream();
  assert.equal((await payHandler(request('/api/cart/pay', input(), { Origin: 'https://evil.example' }))).status, 403);
  assert.equal((await payHandler(request('/api/cart/pay', { ...input(), redirect_url: 'https://evil.example' }))).status, 400);
  assert.equal((await payHandler(request('/api/cart/pay', { ...input(), attempt_id: 'x' }))).status, 400);
  assert.equal((await payHandler(request('/api/cart/pay', { x: 'x'.repeat(17000) }))).status, 413);
  assert.equal(calls.length, 0);
});
test('direct checkout forwards server addresses, account cookies and nonce to fixed WordPress endpoint', async () => {
  const calls = upstream();
  const response = await payHandler(request('/api/cart/pay', input()));
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { order_id: 55, redirect_url: BANK });
  assert.equal(calls.length, 2);
  const call = calls[1];
  assert.equal(call.url, 'https://cms.example.test/wp-json/nrh/v1/checkout');
  assert.equal(call.options.method, 'POST'); assert.equal(call.options.redirect, 'error'); assert.equal(call.options.cache, 'no-store');
  assert.match(call.options.headers.Cookie, /wordpress_logged_in_test=verified/);
  assert.equal(call.options.headers['X-WP-Nonce'], '1234567890');
  assert.equal(call.options.headers.Nonce, 'abcdef1234');
  assert.equal(call.options.headers['Cart-Token'], undefined);
  assert.deepEqual(JSON.parse(call.options.body), { ...input(), billing_address: cart().billing_address, shipping_address: cart().shipping_address });
  assert.match(response.headers.get('Cache-Control'), /private, no-store/);
});
test('same total with changed items or address is rejected before payment', async () => {
  for (const change of [value => value.items[0].id++, value => value.billing_address.city = 'تهران']) {
    const changed = cart(); change(changed);
    const calls = upstream(changed);
    const response = await payHandler(request('/api/cart/pay', input()));
    assert.equal(response.status, 409); assert.equal((await response.json()).code, 'cart_changed');
    assert.equal(calls.length, 1);
  }
});
test('unavailable gateway, invalid cart and missing shipping selection fail before payment', async () => {
  for (const change of [value => value.payment_methods = ['bacs'], value => value.needs_shipping = true, value => value.errors = ['stock']]) {
    const value = cart(); change(value); const calls = upstream(value);
    assert.equal((await payHandler(request('/api/cart/pay', input(value)))).status, 409);
    assert.equal(calls.length, 1);
  }
});
test('malicious gateway redirect cannot leave the allowed bank/frontend paths', async () => {
  for (const value of ['https://sadad.shaparak.ir.evil.test/VPG/Purchase?Token=12345678', 'javascript:alert(1)', 'https://sadad.shaparak.ir/else?Token=12345678', BANK + '&next=https://evil.test', 'https://u:p@sadad.shaparak.ir/VPG/Purchase?Token=12345678']) {
    upstream(cart(), value);
    assert.equal((await payHandler(request('/api/cart/pay', input()))).status, 502);
  }
});
test('only the matching local order-result URL is accepted for recovery', async () => {
  assert.equal(allowedPaymentRedirect('https://shop.example.test/checkout/result?order=55', 'https://shop.example.test', 55), true);
  assert.equal(allowedPaymentRedirect('https://shop.example.test/checkout/result?order=56', 'https://shop.example.test', 55), false);
  assert.equal(allowedPaymentRedirect('https://shop.example.test/checkout/result?order=55&paid=true', 'https://shop.example.test', 55), false);
});
test('lost payment response is never automatically resubmitted', async () => {
  let writes = 0;
  global.fetch = async (url) => {
    if (String(url).includes('/nrh/')) { writes++; throw new Error('connection lost'); }
    return json(cart());
  };
  assert.equal((await payHandler(request('/api/cart/pay', input()))).status, 502);
  assert.equal(writes, 1);
});
test('parallel payment requests serialize each account across the cart transaction', async () => {
  let active = 0, maximum = 0;
  global.fetch = async url => {
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    return String(url).includes('/nrh/') ? json({ order_id: 55, redirect_url: BANK }) : json(cart());
  };
  const started = performance.now();
  const responses = await Promise.all(Array.from({ length: 6 }, () => payHandler(request('/api/cart/pay', input()))));
  assert.equal(responses.every(response => response.status === 200), true);
  assert.equal(maximum, 1);
  assert.ok(performance.now() - started < 3000, 'six serialized mock upstream transactions exceeded local budget');
});
test('upstream stack traces and gateway credentials are not exposed', async () => {
  global.fetch = async url => String(url).includes('/nrh/') ? json({ code: 'internal_error', message: 'SECRET /var/www/index.php terminal_key' }, 500) : json(cart());
  const response = await payHandler(request('/api/cart/pay', input()));
  assert.equal(response.status, 502); assert.doesNotMatch(await response.text(), /SECRET|terminal_key|var\/www/);
});
test('authenticated payment starts have a separate user rate limit', async () => {
  const calls = upstream();
  for (let i = 0; i < 8; i++) assert.equal((await payHandler(request('/api/cart/pay', input()))).status, 200);
  assert.equal((await payHandler(request('/api/cart/pay', input()))).status, 429);
  assert.equal(calls.filter(call => call.options.method === 'POST').length, 8);
});
test('order status uses authenticated WordPress ownership checks and ignores success query strings', async () => {
  global.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/wp-json/nrh/v1/orders/55');
    assert.match(options.headers.Cookie, /verified/); assert.equal(options.headers['X-WP-Nonce'], '1234567890');
    assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
    return json(status);
  };
  const response = await paymentStatusHandler(request('/api/payments/55?success=true'), context);
  assert.equal((await response.json()).paid, false);
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
});
test('unknown/foreign order remains 404 and unauthorized requests never reach WordPress', async () => {
  global.fetch = async () => json({ message: 'SECRET' }, 404);
  assert.equal((await paymentStatusHandler(request('/api/payments/55'), context)).status, 404);
  auth.getSession = async () => null;
  global.fetch = async () => { throw new Error('Must not call WordPress'); };
  assert.equal((await paymentStatusHandler(request('/api/payments/55'), context)).status, 401);
});
test('forged order ID response, unexpected fields and cached private results fail closed', async () => {
  for (const reply of [json({ ...status, order_id: 99 }), json({ ...status, token: 'secret' }), json(status, 200, { 'X-LiteSpeed-Cache': 'miss', 'CF-Cache-Status': 'HIT' }), json({ ...status, extra: 'x'.repeat(10000) })]) {
    global.fetch = async () => reply;
    assert.equal((await paymentStatusHandler(request('/api/payments/55'), context)).status, 502);
  }
});
test('status POST is CSRF protected and its body has a hard size limit', async () => {
  const calls = [];
  global.fetch = async (url, options) => { calls.push(options.method); return json(status); };
  assert.equal((await paymentStatusHandler(request('/api/payments/55', {}, { Origin: 'https://evil.test' }), context)).status, 403);
  assert.equal((await paymentStatusHandler(request('/api/payments/55', { x: 'x'.repeat(1000) }), context)).status, 413);
  assert.equal((await paymentStatusHandler(request('/api/payments/55', { paid: true }), context)).status, 400);
  assert.equal((await paymentStatusHandler(request('/api/payments/55', {}), context)).status, 200);
  assert.deepEqual(calls, ['POST']);
});

test('paid-cart cleanup cannot overlap a cart write for the same account', async () => {
  let releaseRefresh, enterRefresh;
  const entered = new Promise(resolve => { enterRefresh = resolve; });
  const release = new Promise(resolve => { releaseRefresh = resolve; });
  let cartCalls = 0;
  global.fetch = async (url) => {
    if (String(url).includes('/nrh/v1/orders/')) {
      enterRefresh(); await release; return json({ ...status, paid: true, payment_state: 'paid', status: 'processing' });
    }
    cartCalls++; return json(cart());
  };
  const refreshing = paymentStatusHandler(request('/api/payments/55', {}), context);
  await entered;
  const adding = addItemHandler(request('/api/cart/add-item', { id: 12, quantity: 1 }));
  try {
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(cartCalls, 0, 'A cart read/write ran while order refresh could clear the same cart.');
  } finally {
    releaseRefresh();
    const responses = await Promise.all([refreshing, adding]);
    assert.equal(responses.every(value => value.status === 200), true);
  }
  assert.equal(cartCalls, 2);
});

module.exports = { cart, checkoutSnapshot };
