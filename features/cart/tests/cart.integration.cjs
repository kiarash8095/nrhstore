/* eslint-disable @typescript-eslint/no-require-imports -- Standalone integration tests. */
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const load = require('../../auth/tests/auth-test-loader.cjs');
const { NextRequest } = require('next/server');
const handlers = load('features/cart/server/handlers.ts');
const { quantityStep, money, cartItemPath } = load('features/cart/utils/cart.utils.ts');
const { clearAllRateLimits } = load('lib/server/rate-limit.ts');
const auth = load('features/auth/server/backend/adapter.ts').authAdapter;
const { encodeJar } = load('features/auth/server/cookies.ts');
const originalSession = auth.getSession;
const originalFetch = global.fetch;
const TOKEN = 'test-cart-token-12345678901234567890';
const KEY = 'a'.repeat(32);
process.env.WP_API_URL = 'https://cms.example.test/wp-json';
process.env.AUTH_SESSION_SECRET = 'cart-integration-test-secret-at-least-32-characters';
function cart(quantity = 0) {
  return {
    items: quantity ? [{ id: 12, key: KEY, name: 'کالای تست', quantity, quantity_limits: { minimum: 1, maximum: 4, multiple_of: 1, editable: true } }] : [],
    items_count: quantity, coupons: [], totals: { total_price: String(quantity * 250000), currency_code: 'IRT', currency_minor_unit: 0 },
    errors: [], billing_address: {}, shipping_address: {}, shipping_rates: [], needs_shipping: true,
  };
}
function json(data, status = 200, token = TOKEN) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cart-Token': token, Nonce: 'abcdef1234', 'User-ID': '7' } });
}
function accountCookie() {
  auth.getSession = async () => ({ user: { id: '7' }, jar: { wordpress_logged_in_test: 'login', wp_rest: '1234567890' } });
  return 'nrh_auth=' + encodeJar({ wordpress_logged_in_test: 'login' });
}
function req(path = '', body, cookie = 'nrh_cart_guest=' + TOKEN, extra = {}) {
  return new NextRequest('https://shop.example.test/api/cart' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), Cookie: cookie, Origin: 'https://shop.example.test', ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
beforeEach(() => { clearAllRateLimits(); });
afterEach(() => { global.fetch = originalFetch; auth.getSession = originalSession; });

test('guest bootstrap stores an HttpOnly token and never exposes it in JSON', async () => {
  global.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/wp-json/wc/store/v1/cart');
    assert.ok(new URL(url).searchParams.get('_nrh_request'));
    assert.equal(options.cache, 'no-store'); assert.equal(options.redirect, 'error');
    assert.equal(options.headers['Cart-Token'], undefined);
    return json(cart());
  };
  const response = await handlers.getCartHandler(req('', undefined, ''));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Set-Cookie'), /HttpOnly/i);
  assert.match(response.headers.get('Cache-Control'), /private, no-store/);
  assert.doesNotMatch(await response.text(), /test-cart-token/);
});

test('add sends the exact product/variation payload and keeps the full backend totals', async () => {
  const input = { id: 12, quantity: 2, variation: [{ attribute: 'pa_color', value: 'black' }] };
  let writes = 0;
  global.fetch = async (url, options) => {
    assert.equal(options.headers['Cart-Token'], TOKEN);
    if (options.method === 'POST') {
      writes++; assert.equal(String(url).endsWith('/cart/add-item'), true);
      assert.deepEqual(JSON.parse(options.body), input);
      return json(cart(2), 201, TOKEN + '-rotated');
    }
    return json(cart());
  };
  const response = await handlers.addItemHandler(req('/add-item', input));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.items_count, 2); assert.equal(data.totals.total_price, '500000');
  assert.equal(writes, 1); assert.match(response.headers.get('Set-Cookie'), /rotated/);
});

test('update, remove, coupons, address, and shipping use their allowlisted routes', async () => {
  const cases = [
    ['updateItemHandler', 'update-item', { key: KEY, quantity: 3 }],
    ['removeItemHandler', 'remove-item', { key: KEY }],
    ['applyCouponHandler', 'apply-coupon', { code: 'SALE' }],
    ['removeCouponHandler', 'remove-coupon', { code: 'SALE' }],
    ['updateCustomerHandler', 'update-customer', { billing_address: { country: 'IR', city: 'همدان' }, shipping_address: { country: 'IR', city: 'همدان' } }],
    ['shippingHandler', 'select-shipping-rate', { package_id: 0, rate_id: 'flat_rate:3' }],
  ];
  for (const [name, path, input] of cases) {
    let seen = false;
    global.fetch = async (url, options) => {
      if (options.method === 'POST') { seen = true; assert.equal(String(url).endsWith('/cart/' + path), true); assert.deepEqual(JSON.parse(options.body), input); }
      return json(cart(1));
    };
    assert.equal((await handlers[name](req('/' + path, input))).status, 200);
    assert.equal(seen, true);
  }
});

test('clear handles an empty 204 response then reads the complete cart', async () => {
  let removed = false;
  global.fetch = async (url, options) => {
    if (options.method === 'DELETE') { removed = true; assert.equal(String(url).endsWith('/cart/items'), true); return new Response(null, { status: 204 }); }
    return json(cart(removed ? 0 : 2));
  };
  const response = await handlers.clearCartHandler(req('/clear', {}));
  assert.equal((await response.json()).items_count, 0);
});

test('409 reconciles the backend cart and retains the error code without HTML', async () => {
  global.fetch = async (_url, options) => options.method === 'POST'
    ? json({ code: 'woocommerce_rest_cart_invalid_quantity', message: '<b>موجودی کافی نیست</b>', data: { cart: cart(1) } }, 409)
    : json(cart(2));
  const response = await handlers.updateItemHandler(req('/update-item', { key: KEY, quantity: 5 }));
  const data = await response.json();
  assert.equal(response.status, 409); assert.equal(data.data.cart.items_count, 1);
  assert.equal(data.code, 'woocommerce_rest_cart_invalid_quantity'); assert.equal(data.message.includes('<'), false);
});

test('a lost write response is never retried and bootstrap token is retained', async () => {
  let writes = 0;
  global.fetch = async (_url, options) => {
    if (options.method === 'POST') { writes++; throw new Error('lost response'); }
    return json(cart());
  };
  const initialized = await handlers.getCartHandler(req('', undefined, ''));
  const cookie = 'nrh_cart_guest=' + initialized.cookies.get('nrh_cart_guest').value;
  const response = await handlers.addItemHandler(req('/add-item', { id: 12, quantity: 1 }, cookie));
  assert.equal(response.status, 502); assert.equal(writes, 1);
  assert.match(response.headers.get('Set-Cookie'), /nrh_cart_guest/);
});

test('invalid input, price injection, bad keys and cross-origin writes never reach WooCommerce', async () => {
  global.fetch = async () => { throw new Error('must not fetch'); };
  for (const input of [{ id: '12', quantity: 1 }, { id: 12, quantity: 0 }, { id: 12, quantity: -1 }, { id: 12, quantity: 1, price: '1' }]) {
    assert.equal((await handlers.addItemHandler(req('/add-item', input))).status, 400);
  }
  assert.equal((await handlers.removeItemHandler(req('/remove-item', { key: '../../settings' }))).status, 400);
  assert.equal((await handlers.addItemHandler(req('/add-item', { id: 12, quantity: 1 }, '', { Origin: 'https://evil.test' }))).status, 403);
  assert.equal((await handlers.getCartHandler(req('', undefined, '', { 'sec-fetch-site': 'cross-site' }))).status, 403);
  assert.equal((await handlers.applyCouponHandler(req('/apply-coupon', { code: 'x'.repeat(20000) }))).status, 413);
});

test('malformed upstream responses fail safely', async () => {
  global.fetch = async () => json({ items: [] });
  assert.equal((await handlers.getCartHandler(req())).status, 502);
});

test('a read preserves the guest cart until the explicit sync POST completes', async () => {
  auth.getSession = async () => ({ user: { id: '7', phone: '' }, jar: { wordpress_logged_in_test: 'login', wp_rest: '1234567890' } });
  const cookie = 'nrh_auth=' + encodeJar({ wordpress_logged_in_test: 'login' }) + '; nrh_cart_guest=' + TOKEN;
  global.fetch = async (url, options) => {
    assert.equal(options.headers.Cookie, undefined);
    assert.equal(options.headers['Cart-Token'], TOKEN);
    assert.equal(new URL(url).pathname.endsWith('/cart'), true);
    return json(cart(2));
  };
  const response = await handlers.getCartHandler(req('', undefined, cookie));
  assert.equal((await response.json()).account_sync_pending, true);
});

test('authenticated carts use verified cookies without selecting the incompatible token session', async () => {
  auth.getSession = async () => ({ user: { id: '7', phone: '' }, jar: { wordpress_logged_in_test: 'login', wp_rest: '1234567890' } });
  const cookie = 'nrh_auth=' + encodeJar({ wordpress_logged_in_test: 'login' });
  global.fetch = async (_url, options) => {
    assert.match(options.headers.Cookie, /wordpress_logged_in_test=login/);
    assert.equal(options.headers['X-WP-Nonce'], '1234567890');
    assert.equal(options.headers['Cart-Token'], undefined);
    return json(cart(1));
  };
  const response = await handlers.getCartHandler(req('', undefined, cookie));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Set-Cookie'), null);
  assert.equal(response.cookies.has('nrh_auth'), false, 'Cart responses must not rewrite authentication cookies');
  assert.equal((await response.json()).account_sync_pending, false);
});

test('writes without a bootstrapped cart are rejected before WooCommerce without writing a competing cookie', async () => {
  global.fetch = async () => { throw new Error('Must not reach WooCommerce'); };
  const response = await handlers.addItemHandler(req('/add-item', { id: 12, quantity: 1 }, ''));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, 'cart_session_required');
  assert.equal(response.headers.get('set-cookie'), null);
});

test('a stale client identity cannot write to a newly authenticated cart', async () => {
  auth.getSession = async () => ({ user: { id: '7', phone: '' }, jar: { wordpress_logged_in_test: 'login' } });
  global.fetch = async () => { throw new Error('Must not reach WooCommerce'); };
  const response = await handlers.addItemHandler(req('/add-item', { id: 12, quantity: 1 }, 'nrh_auth=' + encodeJar({ wordpress_logged_in_test: 'login' }), { 'X-NRH-Cart-Identity': 'guest' }));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, 'cart_session_changed');
  assert.equal(response.headers.get('set-cookie'), null);
});

test('a read of an initialized cart does not rewrite a newer cart cookie', async () => {
  global.fetch = async () => json(cart(1), 200, TOKEN + '-rotated');
  const response = await handlers.getCartHandler(req());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('quantity controls honor WooCommerce minimum, maximum, increments, and fixed quantities', () => {
  const item = { quantity: 2, quantity_limits: { minimum: 2, maximum: 6, multiple_of: 2, editable: true } };
  assert.equal(quantityStep(item, -1), null); assert.equal(quantityStep(item, 1), 4);
  assert.equal(quantityStep({ ...item, quantity: 6 }, 1), null);
  assert.equal(quantityStep({ ...item, quantity_limits: { ...item.quantity_limits, editable: false } }, 1), null);
  assert.match(money('250000', { currency_code: 'IRT', currency_minor_unit: 0 }), /تومان/);
  assert.equal(cartItemPath({ permalink: 'https://cms.example.test/product/laptop/' }), '/products/laptop');
});

test('personal GETs use unique URLs and reject a cached cart response', async () => {
  const urls = [];
  global.fetch = async (url, options) => { urls.push(String(url)); assert.equal(options.headers['Cache-Control'], 'no-cache, no-store'); return json(cart()); };
  await handlers.getCartHandler(req('', undefined, ''));
  await handlers.getCartHandler(req('', undefined, ''));
  assert.notEqual(urls[0], urls[1]);
  global.fetch = async () => new Response(JSON.stringify(cart()), { headers: { 'Cart-Token': TOKEN, 'X-LiteSpeed-Cache': 'hit' } });
  const response = await handlers.getCartHandler(req());
  assert.equal(response.status, 502); assert.equal((await response.json()).code, 'cart_cache_misconfigured');
});

test('server mutation errors never expose PHP stack traces or server paths', async () => {
  const cookie = accountCookie();
  global.fetch = async url => new URL(url).pathname.endsWith('/cart/add-item')
    ? json({ code: 'internal_server_error', message: '/home/private/wp-content/theme.php SECRET', data: { error: { message: 'SECRET stack trace' } } }, 500)
    : json(cart(1));
  const response = await handlers.addItemHandler(req('/add-item', { id: 12, quantity: 1 }, cookie));
  const text = await response.text();
  assert.equal(response.status, 502); assert.equal(text.includes('SECRET'), false); assert.equal(text.includes('/home/'), false);
});

test('guests cannot transfer a cart', async () => {
  global.fetch = async () => { throw new Error('Must not call WordPress'); };
  for (const name of ['syncCartHandler']) {
    assert.equal((await handlers[name](req('/checkout', {}))).status, 401);
  }
});

test('account writes forward the fresh Woo nonce and ignore old account Cart-Tokens', async () => {
  const cookie = accountCookie() + '; nrh_cart_user_7=' + TOKEN;
  let writes = 0;
  global.fetch = async (_url, options) => {
    assert.equal(options.headers['Cart-Token'], undefined);
    assert.match(options.headers.Cookie, /wordpress_logged_in_test=login/);
    if (options.method === 'POST') { writes++; assert.equal(options.headers.Nonce, 'abcdef1234'); }
    return json(cart(1));
  };
  assert.equal((await handlers.addItemHandler(req('/add-item', { id: 12, quantity: 1 }, cookie))).status, 200);
  assert.equal(writes, 1);
});

test('wrong-user or missing-nonce account responses cannot authorize a write', async () => {
  const cookie = accountCookie();
  for (const headers of [{ Nonce: 'abcdef1234', 'User-ID': '8' }, { 'User-ID': '7' }, { Nonce: 'abcdef1234' }]) {
    let writes = 0;
    global.fetch = async (_url, options) => {
      if (options.method !== 'GET') writes++;
      return new Response(JSON.stringify(cart(1)), { headers });
    };
    assert.equal((await handlers.addItemHandler(req('/add-item', { id: 12, quantity: 1 }, cookie))).status, 502);
    assert.equal(writes, 0);
  }
});

test('oversized upstream cart bodies cannot reach a subsequent mutation', async () => {
  let writes = 0;
  global.fetch = async (_url, options) => {
    if (options.method !== 'GET') writes++;
    return json({ ...cart(1), padding: 'x'.repeat(2 * 1024 * 1024) });
  };
  assert.equal((await handlers.addItemHandler(req('/add-item', { id: 12, quantity: 1 }))).status, 502);
  assert.equal(writes, 0);
});

test('sync posts the guest token server-side and retires its cookie after account readback', async () => {
  const cookie = accountCookie() + '; nrh_cart_guest=' + TOKEN;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push(options.method);
    if (String(url).endsWith('/nrh/v1/cart/merge')) {
      assert.deepEqual(JSON.parse(options.body), { guest_token: TOKEN });
      assert.equal(options.headers['Cart-Token'], undefined);
      assert.equal(options.headers['X-WP-Nonce'], '1234567890');
      return json({ merged: true });
    }
    return json(cart(options.headers.Cookie ? 3 : 2));
  };
  const response = await handlers.syncCartHandler(req('/sync', {}, cookie));
  const data = await response.json();
  assert.equal(response.status, 200); assert.equal(data.items_count, 3); assert.equal(data.account_sync_pending, false);
  assert.match(response.headers.get('Set-Cookie'), /nrh_cart_guest=;.*Max-Age=0/);
  assert.deepEqual(calls, ['GET', 'POST', 'GET']);
  assert.ok(!JSON.stringify(data).includes(TOKEN));
});

test('missing merge service or failed account readback keeps the guest cookie and cart', async () => {
  const cookie = accountCookie() + '; nrh_cart_guest=' + TOKEN;
  for (const mode of ['missing', 'readback', 'lost']) {
    let writes = 0;
    global.fetch = async (url, options) => {
      if (String(url).endsWith('/nrh/v1/cart/merge')) {
        writes++;
        if (mode === 'lost') throw new Error('Lost response');
        return mode === 'missing' ? json({ code: 'rest_no_route' }, 404) : json({ merged: true });
      }
      return options.headers.Cookie ? json({}, 500) : json(cart(2));
    };
    const response = await handlers.syncCartHandler(req('/sync', {}, cookie));
    const data = await response.json();
    assert.notEqual(response.status, 200); assert.equal(data.data.cart.items_count, 2);
    assert.equal(data.data.cart.account_sync_pending, true);
    assert.equal(response.cookies.get('nrh_cart_guest')?.value, TOKEN);
    assert.equal(writes, 1);
    if (mode === 'missing') assert.equal(data.code, 'cart_bridge_missing');
  }
});

test('missing authentication configuration prevents a broken cart session before contacting WooCommerce', async () => {
  const secret = process.env.AUTH_SESSION_SECRET;
  delete process.env.AUTH_SESSION_SECRET;
  let calls = 0;
  global.fetch = async () => { calls++; throw new Error('Must not reach WooCommerce'); };
  try {
    const response = await handlers.getCartHandler(req('', undefined, ''));
    assert.equal(response.status, 503);
    const data = await response.json();
    assert.equal(data.code, 'configuration_error');
    assert.equal(calls, 0);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.ok(!JSON.stringify(data).includes('AUTH_SESSION_SECRET'));
  } finally { process.env.AUTH_SESSION_SECRET = secret; }
});
