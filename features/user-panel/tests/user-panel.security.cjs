/* eslint-disable @typescript-eslint/no-require-imports -- Isolated real-handler security tests. */
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const load = require('../../auth/tests/auth-test-loader.cjs');
const { NextRequest } = require('next/server');
const { accountHandler } = load('features/user-panel/server/handlers.ts');
const { normalizeProfile } = load('features/user-panel/server/normalize.ts');
const { encodeJar } = load('features/auth/server/cookies.ts');
const { authAdapter } = load('features/auth/server/backend/adapter.ts');
const { clearAllRateLimits } = load('lib/server/rate-limit.ts');
const fixtures = require('./fixtures.cjs');
const oldFetch = global.fetch,
  oldSession = authAdapter.getSession;
process.env.AUTH_SESSION_SECRET = randomBytes(32).toString('hex');
process.env.WP_API_URL = 'https://cms.example.test/wp-json';
process.env.CART_LOCK_DIR = require('node:path').join(
  process.cwd(),
  'artifacts',
  'user-panel',
  'security-locks-' + randomBytes(8).toString('hex'),
);
let calls, scenario;
const response = (data, status = 200, headers = {}) =>
  Response.json(data, { status, headers });
beforeEach(() => {
  calls = [];
  scenario = '';
  clearAllRateLimits();
  authAdapter.getSession = async () => ({
    user: { id: '7' },
    jar: { wordpress_logged_in_test: 'mock-session', wp_rest: '1234567890' },
  });
  global.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname;
    calls.push({ url: String(url), method: options.method || 'GET', options });
    if (scenario === 'outage')
      return response(
        { message: '/home/private SECRET merchant_key stacktrace' },
        500,
      );
    if (scenario === 'cache')
      return response({ ...fixtures.profile, secret: 'SECRET' }, 200, {
        'X-LiteSpeed-Cache': 'hit',
      });
    if (scenario === 'oversized')
      return response({ padding: 'x'.repeat(524289) });
    if (path.includes('/wc/store/'))
      return scenario === 'catalog-down'
        ? response({}, 503)
        : response(fixtures.products);
    assert.equal(
      options.headers.Cookie,
      'wordpress_logged_in_test=mock-session',
    );
    assert.equal(options.headers['X-WP-Nonce'], '1234567890');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.redirect, 'error');
    if (path.endsWith('/my-orders'))
      return response(
        scenario === 'malformed'
          ? { success: true, orders: 'PRIVATE' }
          : {
              success: true,
              orders:
                scenario === 'empty-orders'
                  ? []
                  : fixtures.orders.map((order) => ({
                      ...order,
                      currency:
                        scenario === 'missing-currency'
                          ? undefined
                          : order.currency,
                    })),
              current_page: 1,
              max_num_pages: 1,
            },
      );
    if (path.includes('/my-orders/'))
      return response({
        success: true,
        order: {
          ...fixtures.detail,
          currency:
            scenario === 'missing-currency'
              ? undefined
              : fixtures.detail.currency,
          ...(scenario === 'foreign'
            ? { customer_id: 8 }
            : scenario === 'wrong-id'
              ? { id: 56 }
              : {}),
        },
      });
    if (path.endsWith('/profile-fields')) {
      if (options.method === 'POST') {
        if (scenario === 'lost-write') throw new Error('Lost response');
        return response({ success: true });
      }
      return response(fixtures.profile);
    }
    if (path.endsWith('/balance'))
      return response({
        success: true,
        balance: 'SECRET',
        completed_orders: 4,
        cancelled_orders: 1,
        refunded_orders: 0,
      });
    if (path.includes('/addresses'))
      return response(
        options.method === 'GET'
          ? { addresses: [fixtures.address] }
          : { success: true },
      );
    if (path.includes('/wishlist')) return response([12, 13]);
    throw new Error('Unexpected upstream ' + path);
  };
});
after(() => {
  global.fetch = oldFetch;
  authAdapter.getSession = oldSession;
});
function request(path, method = 'GET', body, headers = {}, cookie = true) {
  return new NextRequest('https://shop.example.test/api/account/' + path, {
    method,
    headers: {
      Origin: 'https://shop.example.test',
      ...(cookie
        ? {
            Cookie:
              'nrh_auth=' +
              encodeJar({ wordpress_logged_in_test: 'mock-session' }),
          }
        : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
function run(path, method = 'GET', body, headers, cookie) {
  return accountHandler(request(path, method, body, headers, cookie), {
    params: Promise.resolve({ path: path.split('?')[0].split('/') }),
  });
}

test('anonymous, forged-cookie and expired sessions cannot read any account resources', async () => {
  for (const path of [
    'orders',
    'orders/55',
    'profile',
    'addresses',
    'wishlist',
    'stats',
  ])
    assert.equal((await run(path, 'GET', undefined, {}, false)).status, 401);
  assert.equal(
    (
      await run(
        'profile',
        'GET',
        undefined,
        { Cookie: 'nrh_auth=forged' },
        false,
      )
    ).status,
    401,
  );
  authAdapter.getSession = async () => null;
  assert.equal((await run('profile')).status, 401);
  assert.equal(calls.length, 0);
});
test('cross-origin requests and stale identity hints fail before any upstream account access', async () => {
  assert.equal(
    (
      await run(
        'profile',
        'POST',
        { values: {} },
        { Origin: 'https://evil.test' },
      )
    ).status,
    403,
  );
  assert.equal(
    (await run('orders', 'GET', undefined, { 'Sec-Fetch-Site': 'cross-site' }))
      .status,
    403,
  );
  assert.equal(
    (
      await run('addresses', 'GET', undefined, {
        'X-NRH-Account-Identity': '8',
      })
    ).status,
    409,
  );
  assert.equal(calls.length, 0);
});
test('route allowlist, IDs, query keys and delete bodies cannot reach arbitrary WordPress APIs', async () => {
  for (const path of [
    'users/7',
    'orders/0',
    'orders/7/extra',
    'profile/admin',
    'addresses/01',
    'wishlist/999999999999999999',
  ])
    assert.ok([400, 404].includes((await run(path)).status));
  for (const path of [
    'orders?user_id=8',
    'orders?page=0',
    'orders?page=1&page=2',
    'orders?page=abc',
  ])
    assert.equal((await run(path)).status, 400);
  assert.equal(
    (await run('addresses/101', 'DELETE', { user_id: 8 })).status,
    400,
  );
  assert.equal(calls.length, 0);
});
test('order responses are private and curated, with server cookie+nonce and no credentials exposed', async () => {
  const result = await run('orders');
  assert.equal(result.status, 200);
  assert.match(result.headers.get('cache-control'), /private, no-store/);
  const data = await result.json();
  assert.equal(data.orders[0].id, 55);
  assert.equal(data.orders[0].currency, 'IRT');
  assert.equal(data.orders[0].customer_id, undefined);
  const call = calls.find((call) => call.url.includes('/my-orders?'));
  assert.ok(call.url.includes('_nrh_request='));
  assert.ok(call.url.includes('per_page=10'));
  assert.ok(!JSON.stringify(data).includes('mock-session'));
});
test('foreign or mismatched order details fail closed and notes are plain text', async () => {
  for (const mode of ['foreign', 'wrong-id']) {
    scenario = mode;
    const result = await run('orders/55');
    assert.equal(result.status, 502);
    assert.ok(!(await result.text()).includes('سارا'));
  }
  scenario = '';
  const data = await (await run('orders/55')).json();
  assert.equal(data.notes[0].content, 'سفارش شما در حال آماده‌سازی است.');
  assert.equal(data.address.postcode, '6511111111');
  assert.match(data.address.address, /^همدان،/);
});

test('orders with their own currency remain readable when the public catalog is unavailable', async () => {
  scenario = 'catalog-down';
  assert.equal((await run('orders')).status, 200);
  assert.equal((await run('orders/55')).status, 200);
  assert.ok(
    calls.every((call) => !new URL(call.url).pathname.includes('/wc/store/')),
  );
});

test('legacy orders without currency use the store fallback, while an empty list needs no catalog call', async () => {
  scenario = 'missing-currency';
  assert.equal((await (await run('orders/55')).json()).currency, 'IRT');
  assert.ok(
    calls.some((call) => new URL(call.url).pathname.includes('/wc/store/')),
  );
  calls = [];
  scenario = 'empty-orders';
  assert.deepEqual((await (await run('orders')).json()).orders, []);
  assert.ok(
    calls.every((call) => !new URL(call.url).pathname.includes('/wc/store/')),
  );
});
test('malformed, oversized, cached and failed upstream responses expose no private content', async () => {
  for (const mode of ['malformed', 'oversized', 'cache', 'outage']) {
    scenario = mode;
    const result = await run(mode === 'malformed' ? 'orders' : 'profile');
    assert.equal(result.status, 502);
    assert.doesNotMatch(
      await result.text(),
      /SECRET|merchant|stacktrace|\/home/,
    );
  }
});
test('dynamic profile metadata cannot expose privilege values or make login identity editable', () => {
  const result = normalizeProfile({
    fields: [
      ...fixtures.profile.fields,
      { key: 'wp_capabilities', type: 'text' },
      { key: 'user_id', type: 'text' },
    ],
    values: {
      ...fixtures.profile.values,
      wp_capabilities: 'SECRET',
      user_id: '8',
    },
  });
  assert.equal(
    result.fields.find((field) => field.key === 'phone').editable,
    false,
  );
  assert.ok(!JSON.stringify(result).includes('SECRET'));
  assert.ok(!('user_id' in result.values));
});
test('profile writes allow only configured editable fields and preserve verified login phone', async () => {
  for (const values of [
    { role: 'administrator' },
    { phone: '09999999999' },
    { user_id: '8' },
    { email: 'bad', first_name: 'نام', last_name: 'تست' },
  ])
    assert.equal((await run('profile', 'POST', { values })).status, 400);
  assert.equal(calls.filter((call) => call.method === 'POST').length, 0);
  const result = await run('profile', 'POST', {
    values: {
      first_name: ' نام ',
      last_name: 'تست',
      email: 'test@example.invalid',
    },
  });
  assert.equal(result.status, 200);
  const body = JSON.parse(
    calls.find((call) => call.method === 'POST').options.body,
  );
  assert.equal(body.values.first_name, 'نام');
  assert.equal(body.values.phone, fixtures.customer.phone);
  assert.equal(body.user_id, undefined);
});
test('address mutations validate fields, normalize Persian digits and never accept ownership fields', async () => {
  const { id, is_default, ...data } = fixtures.address;
  void id;
  void is_default;
  assert.equal(
    (await run('addresses', 'POST', { ...data, user_id: 8 })).status,
    400,
  );
  assert.equal(
    (await run('addresses', 'POST', { ...data, postcode: '12' })).status,
    400,
  );
  const result = await run('addresses', 'POST', {
    ...data,
    phone: '۰۹۱۲۳۴۵۶۷۸۹',
    postcode: '۶۵۱۱۱۱۱۱۱۱',
  });
  assert.equal(result.status, 200);
  const body = JSON.parse(
    calls.find((call) => call.method === 'POST').options.body,
  );
  assert.equal(body.phone, '09123456789');
  assert.equal(body.postcode, '6511111111');
  assert.equal((await run('addresses/101', 'PUT', data)).status, 200);
  assert.equal((await run('addresses/101/default', 'POST', {})).status, 200);
  assert.equal((await run('addresses/101', 'DELETE')).status, 200);
});
test('favorite changes stay in the verified account and server product prices are used', async () => {
  assert.equal(
    (await run('wishlist', 'POST', { product_id: 12, user_id: 8 })).status,
    400,
  );
  assert.equal((await run('wishlist', 'POST', { product_id: 12 })).status, 200);
  assert.equal((await run('wishlist/12', 'DELETE')).status, 200);
  const products = await (await run('wishlist/products?page=1')).json();
  assert.equal(products.items.length, 2);
  assert.equal(products.items[0].path, '/products/test-monitor');
  assert.equal(products.items[0].price, '12500000');
});
test('dashboard stats do not forward wallet balances or backend extras', async () => {
  const result = await run('stats');
  assert.deepEqual(await result.json(), {
    completed: 4,
    cancelled: 1,
    refunded: 0,
  });
});
test('an empty HTTP DELETE stream is accepted while actual content remains rejected', async () => {
  const target = request('addresses/101', 'DELETE');
  const streamed = new NextRequest(target.url, {
    method: 'DELETE',
    headers: target.headers,
    body: new ReadableStream({
      start(controller) {
        controller.close();
      },
    }),
    duplex: 'half',
  });
  const result = await accountHandler(streamed, {
    params: Promise.resolve({ path: ['addresses', '101'] }),
  });
  assert.equal(result.status, 200);
});
test('a lost mutation response is never automatically replayed', async () => {
  scenario = 'lost-write';
  assert.equal(
    (
      await run('profile', 'POST', {
        values: {
          first_name: 'نام',
          last_name: 'تست',
          email: 'test@example.invalid',
        },
      })
    ).status,
    502,
  );
  assert.equal(calls.filter((call) => call.method === 'POST').length, 1);
});
test('account mutations serialize across requests for the same customer', async () => {
  const upstream = global.fetch;
  let active = 0,
    max = 0;
  global.fetch = async (url, options) => {
    if (options.method === 'POST') {
      active++;
      max = Math.max(max, active);
      await new Promise((resolve) => setTimeout(resolve, 30));
      try {
        return await upstream(url, options);
      } finally {
        active--;
      }
    }
    return upstream(url, options);
  };
  const data = {
    values: {
      first_name: 'نام',
      last_name: 'تست',
      email: 'test@example.invalid',
    },
  };
  const results = await Promise.all([
    run('profile', 'POST', data),
    run('profile', 'POST', data),
  ]);
  assert.deepEqual(
    results.map((result) => result.status),
    [200, 200],
  );
  assert.equal(max, 1);
});
test('write rate limits reject excess requests before a new upstream write', async () => {
  for (let i = 0; i < 25; i++)
    assert.equal((await run('addresses/101/default', 'POST', {})).status, 200);
  const count = calls.length;
  assert.equal((await run('addresses/101/default', 'POST', {})).status, 429);
  assert.equal(calls.length, count);
});
