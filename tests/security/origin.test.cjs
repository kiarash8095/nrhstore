/* eslint-disable @typescript-eslint/no-require-imports -- Server boundary regression. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const load = require('../../features/auth/tests/auth-test-loader.cjs');
const { NextRequest } = require('next/server');
const { isTrustedOriginRequest } = load('lib/http/request-origin.ts');
const previous = process.env.NEXT_PUBLIC_SITE_URL;
after(() => { if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = previous; });
function request(headers) { return new NextRequest('http://localhost:3000/api/cart/pay', { headers }); }

test('the actual loopback Host is accepted when Next normalizes its internal URL to localhost', () => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
  assert.equal(isTrustedOriginRequest(request({ Host: '127.0.0.1:3000', Origin: 'http://127.0.0.1:3000' })), true);
  assert.equal(isTrustedOriginRequest(request({ Host: '127.0.0.1:3000', Origin: 'http://localhost:3000' })), false);
});
test('a configured public HTTPS origin works behind a proxy without trusting forwarded headers', () => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://shop.example.test';
  assert.equal(isTrustedOriginRequest(request({ Host: 'internal:3000', Origin: 'https://shop.example.test' })), true);
  assert.equal(isTrustedOriginRequest(request({ Host: 'internal:3000', Origin: 'https://evil.example', 'X-Forwarded-Host': 'evil.example', 'X-Forwarded-Proto': 'https' })), false);
});
test('cross-site requests, malformed origins and hostile host values remain rejected', () => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
  for (const headers of [
    { Host: 'shop.example.test', Origin: 'https://shop.example.test', 'Sec-Fetch-Site': 'cross-site' },
    { Host: 'localhost:3000', Origin: 'http://localhost:3000/' },
    { Host: 'evil.example@localhost:3000', Origin: 'http://localhost:3000' },
    { Host: 'localhost:3000', Origin: 'null' },
  ]) assert.equal(isTrustedOriginRequest(request(headers)), false);
});
