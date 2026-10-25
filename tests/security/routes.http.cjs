/* eslint-disable @typescript-eslint/no-require-imports -- Local HTTP security regression. */
const assert = require('node:assert/strict');
const origin = process.env.SECURITY_TEST_URL || 'http://127.0.0.1:4127';
const target = new URL(origin);
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname), 'Run this rejection-only suite against a local test server.');

// Every POST is rejected before upstream mutation. No valid login, SMS, cart write or payment is submitted.
const cases = [
  ['anonymous session', '/api/auth/session', undefined, 401],
  ['cross-site login', '/api/auth/login', { identifier: 'audit@example.invalid', password: 'mock-password' }, 403, { Origin: 'https://evil.example' }],
  ['invalid OTP input', '/api/auth/send-otp', { phone: 'invalid' }, 400],
  ['registration mass assignment', '/api/auth/register', { role: 'administrator' }, 400],
  ['cart price injection', '/api/cart/add-item', { id: 12, quantity: 1, price: '1' }, 400],
  ['cross-site cart read', '/api/cart', undefined, 403, { 'Sec-Fetch-Site': 'cross-site' }],
  ['anonymous cart transfer', '/api/cart/sync', {}, 401],
  ['anonymous payment', '/api/cart/pay', { attempt_id: '01234567-89ab-4cde-8fab-0123456789ab', cart_hash: 'a'.repeat(64), expected_total: '250000' }, 401],
  ['anonymous order access', '/api/payments/55', undefined, 401],
  ['order refresh mass assignment', '/api/payments/55', { paid: true }, 400],
  ['cross-site order access', '/api/payments/55', undefined, 403, { Origin: 'https://evil.example' }],
  ['retired draft endpoint', '/api/cart/checkout', undefined, 404],
];
(async () => {
  const results = [];
  for (const [name, path, body, status, extra] of cases) {
    const response = await fetch(origin + path, {
      method: body === undefined ? 'GET' : 'POST', redirect: 'manual',
      headers: { Origin: origin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...extra },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, status, name);
    if (status !== 404) assert.match(response.headers.get('cache-control'), /no-store/, name);
    assert.equal(response.headers.get('set-cookie'), null, name);
    results.push({ name, status });
  }
  console.log(JSON.stringify({ origin, passed: results.length, results }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
