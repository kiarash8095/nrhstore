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
function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cart-Token': TOKEN, Nonce: 'abcdef1234', 'User-ID': '7', 'X-NRH-Cart-Lock': 'mysql-v1', ...headers } }); }
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
test('BACS forwards only the allowlisted method and note after capability preflight', async () => {
  const value = cart(); value.payment_methods = ['bacs'];
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ path: new URL(url).pathname, options });
    if (String(url).includes('/capabilities')) return json({ checkout: 'bank-and-bacs-v1' });
    if (String(url).includes('/nrh/v1/checkout')) return json({ order_id: 55, redirect_url: 'https://shop.example.test/checkout/result?order=55' });
    return json(value);
  };
  const r = await payHandler(request('/api/cart/pay', { ...input(value), payment_method: 'bacs', customer_note: '  Call before delivery  ' }));
  assert.equal(r.status, 200);
  assert.equal(calls[1].path, '/wp-json/nrh/v1/capabilities');
  const body = JSON.parse(calls[2].options.body);
  assert.equal(body.payment_method, 'bacs'); assert.equal(body.customer_note, 'Call before delivery');
  assert.deepEqual(body.billing_address, value.billing_address);
});
test('an old bridge rejects manual transfer before order creation', async () => {
  const value = cart(); value.payment_methods = ['bacs']; let writes = 0;
  global.fetch = async (url, options) => {
    if (options.method === 'POST') writes++;
    return String(url).includes('/capabilities') ? json({ version: '1.3.1' }) : json(value);
  };
  const r = await payHandler(request('/api/cart/pay', { ...input(value), payment_method: 'bacs' }));
  assert.equal(r.status, 503); assert.equal(writes, 0);
});
test('the browser origin validates manual-transfer return URLs behind an internal localhost URL', async () => {
  const value = cart(); value.payment_methods = ['bacs'];
  global.fetch = async url => String(url).includes('/capabilities') ? json({ checkout: 'bank-and-bacs-v1' }) : String(url).includes('/nrh/v1/checkout') ? json({ order_id: 55, redirect_url: 'http://127.0.0.1:4107/checkout/result?order=55' }) : json(value);
  const body = { ...input(value), payment_method: 'bacs' };
  const r = await payHandler(new NextRequest('http://localhost:4107/api/cart/pay', {
    method: 'POST', headers: { Host: '127.0.0.1:4107', Origin: 'http://127.0.0.1:4107', 'Content-Type': 'application/json', Cookie: 'nrh_auth=' + encodeJar({ wordpress_logged_in_test: 'session' }) }, body: JSON.stringify(body),
  }));
  assert.equal(r.status, 200); assert.equal((await r.json()).order_id, 55);
});
test('unknown methods, note injection and overlong notes fail before upstream', async () => {
  let calls = 0; global.fetch = async () => { calls++; throw Error('unexpected'); };
  for (const extra of [{ payment_method: 'wallet' }, { payment_method: ['bacs'] }, { customer_note: {} }, { customer_note: 'a'.repeat(1001) }]) {
    assert.equal((await payHandler(request('/api/cart/pay', { ...input(), ...extra }))).status, 400);
  }
  assert.equal(calls, 0);
});
test('manual-transfer status is private and malformed bank data is rejected', async () => {
  const transfer = { order_id: 55, status: 'on-hold', paid: false, payment_state: 'transfer_pending', reference: '', payment_method: 'bacs', bank_transfer: { instructions: 'Use order number', accounts: [{ account_name: 'Audit', account_number: '123', bank_name: 'Audit bank', sort_code: '', iban: 'IR000', bic: '' }] } };
  global.fetch = async () => json(transfer);
  const r = await paymentStatusHandler(request('/api/payments/55'), context);
  assert.equal(r.status, 200); assert.match(r.headers.get('cache-control'), /no-store/);
  assert.equal((await r.json()).bank_transfer.accounts[0].account_number, '123');
  for (const corrupt of [{ ...transfer, payment_method: 'melli_pay' }, { ...transfer, paid: true }, { ...transfer, status: 'processing' }, { ...transfer, bank_transfer: { ...transfer.bank_transfer, secret: 'sensitive' } }]) {
    global.fetch = async () => json(corrupt);
    assert.equal((await paymentStatusHandler(request('/api/payments/55'), context)).status, 502);
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
test('parallel payment requests retain the same WordPress identity and idempotency attempt', async () => {
  let active = 0, maximum = 0;
  global.fetch = async (url, options) => {
    assert.equal(options.headers['X-WP-Nonce'], '1234567890');
    if (options.method === 'POST') assert.equal(JSON.parse(options.body).attempt_id, ATTEMPT);
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    return String(url).includes('/nrh/') ? json({ order_id: 55, redirect_url: BANK }) : json(cart());
  };
  const started = performance.now();
  const responses = await Promise.all(Array.from({ length: 6 }, () => payHandler(request('/api/cart/pay', input()))));
  assert.equal(responses.every(response => response.status === 200), true);
  assert.equal(maximum, 6);
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
  global.fetch = async (url, options) => {
    assert.equal(options.headers['X-WP-Nonce'], '1234567890');
    if (String(url).includes('/nrh/v1/orders/')) {
      enterRefresh(); await release; return json({ ...status, paid: true, payment_state: 'paid', status: 'processing' });
    }
    // Model WordPress holding its account lock while paid-cart cleanup runs.
    await release;
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

test('Vercel payment refresh delegates paid-cart serialization to the WordPress account lock', async () => {
  const vercel = process.env.VERCEL, lockDir = process.env.CART_LOCK_DIR;
  process.env.VERCEL = '1'; process.env.CART_LOCK_DIR = __filename;
  try {
    let calls = 0;
    global.fetch = async (url, options) => {
      calls++; assert.match(String(url), /\/nrh\/v1\/orders\/55/); assert.equal(options.method, 'POST'); return json(status);
    };
    assert.equal((await paymentStatusHandler(request('/api/payments/55', {}), context)).status, 200);
    assert.equal(calls, 1);
  } finally {
    if (vercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = vercel;
    if (lockDir === undefined) delete process.env.CART_LOCK_DIR; else process.env.CART_LOCK_DIR = lockDir;
  }
});

module.exports = { cart, checkoutSnapshot };
