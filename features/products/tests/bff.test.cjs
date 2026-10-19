/* eslint-disable @typescript-eslint/no-require-imports -- Standalone test runner. */
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const Module = require('node:module');
const load = require('../../auth/tests/auth-test-loader.cjs');
process.env.WP_API_URL = 'https://cms.example.test/wp-json';
const { NextRequest } = require('next/server');
const { GET } = load('app/api/catalog/[...path]/route.ts');
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

test('catalog proxy rejects private resources and invalid query parameters', async () => {
  global.fetch = async () => { throw new Error('Upstream must not be called.'); };
  for (const [path, query, status] of [['cart', '', 404], ['users', '', 404], ['products', '?per_page=1000', 400], ['products', '?page=0', 400], ['products', '?context=edit', 400]]) {
    const response = await GET(new NextRequest(`http://localhost/api/catalog/${path}${query}`), { params: Promise.resolve({ path: path.split('/') }) });
    assert.equal(response.status, status);
  }
});

test('browser credentials are not forwarded and backend errors are not exposed', async () => {
  global.fetch = async (url, options) => {
    assert.equal(options.headers.Cookie, undefined);
    assert.equal(options.headers.Authorization, undefined);
    return new Response(JSON.stringify({ code: 'db_error', message: 'private database details' }), { status: 500 });
  };
  const response = await GET(new NextRequest('http://localhost/api/catalog/products', { headers: { Cookie: 'private=secret', Authorization: 'secret' } }), { params: Promise.resolve({ path: ['products'] }) });
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /private|database|secret/);
});

test('public catalog response preserves pagination and is marked noindex', async () => {
  global.fetch = async () => new Response('[]', { headers: { 'X-WP-Total': '40', 'X-WP-TotalPages': '4' } });
  const response = await GET(new NextRequest('http://localhost/api/catalog/products'), { params: Promise.resolve({ path: ['products'] }) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-WP-Total'), '40');
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex');
});

test('cache webhook requires a configured secret and a correct WooCommerce signature', async () => {
  const originalLoad = Module._load;
  const calls = [];
  Module._load = function(request, ...args) {
    if (request === 'next/cache') return { revalidateTag: (...values) => calls.push(values) };
    return originalLoad.call(this, request, ...args);
  };
  let POST;
  try { POST = load('app/api/catalog/revalidate/route.ts').POST; }
  finally { Module._load = originalLoad; }
  const body = JSON.stringify({ id: 12 });
  const previous = process.env.WP_WEBHOOK_SECRET;
  const request = (headers = {}) => new Request('http://localhost/api/catalog/revalidate', { method: 'POST', body, headers });
  try {
    delete process.env.WP_WEBHOOK_SECRET;
    assert.equal((await POST(request())).status, 503);
    process.env.WP_WEBHOOK_SECRET = 's'.repeat(32);
    assert.equal((await POST(request())).status, 401);
    const signature = createHmac('sha256', process.env.WP_WEBHOOK_SECRET).update(body).digest('base64');
    assert.equal((await POST(request({ 'x-wc-webhook-signature': signature }))).status, 200);
    assert.deepEqual(calls, [['catalog', 'max']]);
  } finally { if (previous === undefined) delete process.env.WP_WEBHOOK_SECRET; else process.env.WP_WEBHOOK_SECRET = previous; }
});
