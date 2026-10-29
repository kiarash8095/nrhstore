/* eslint-disable @typescript-eslint/no-require-imports -- Isolated banner authentication checks; no banner publication or upstream writes. */
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const load = require('../../auth/tests/auth-test-loader.cjs');
const keys = ['NODE_ENV', 'NEXT_PUBLIC_SITE_URL', 'BANNERS_ADMIN_USERNAME', 'BANNERS_ADMIN_PASSWORD', 'BANNERS_ADMIN_SESSION_SECRET'];
const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
process.env.NODE_ENV = 'production';
const session = load('features/banners/server/admin-session.ts');
const { POST } = load('features/banners/server/handlers/banners-admin-session.ts');
const { clearAllRateLimits } = load('lib/server/rate-limit.ts');
const { BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS, validateBannerAdminEnvironment } = require('../../../lib/server/runtime-config.cjs');
const { NextRequest } = require('next/server');

beforeEach(() => {
  Object.assign(process.env, { NODE_ENV:'production', NEXT_PUBLIC_SITE_URL:'https://shop.example.test', BANNERS_ADMIN_USERNAME:'fixture-admin', BANNERS_ADMIN_PASSWORD:'private-test-password', BANNERS_ADMIN_SESSION_SECRET:randomBytes(32).toString('hex') });
  clearAllRateLimits();
});
after(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

function request(body = { username:'fixture-admin', password:'private-test-password' }, headers = {}) {
  return new NextRequest('http://localhost:3000/api/banners-admin/session', {
    method:'POST', headers:{ 'Content-Type':'application/json', Origin:'http://localhost:3000', ...headers },
    body:typeof body === 'string' ? body : JSON.stringify(body),
  });
}

test('configuration accepts eight characters, rejects seven, and never invents missing credentials', () => {
  process.env.BANNERS_ADMIN_PASSWORD = 'a'.repeat(7);
  assert.equal(session.adminConfig(), null);
  process.env.BANNERS_ADMIN_PASSWORD = 'a'.repeat(8);
  assert.ok(session.adminConfig());
  assert.equal(session.checkAdminCredentials('fixture-admin', 'a'.repeat(8)), true);
  delete process.env.BANNERS_ADMIN_SESSION_SECRET;
  assert.equal(session.adminConfig(), null);
});

test('documented development credentials are accepted only outside production', () => {
  Object.assign(process.env, { BANNERS_ADMIN_USERNAME:BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS.username, BANNERS_ADMIN_PASSWORD:BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS.password });
  assert.equal(session.adminConfig(), null);
  assert.throws(() => validateBannerAdminEnvironment(), /BANNERS_ADMIN_PASSWORD/);
  process.env.NODE_ENV = 'development';
  assert.ok(session.adminConfig());
  assert.equal(session.checkAdminCredentials(BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS.username, BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS.password), true);
});

test('production rejects weak signing secrets without exposing their values', () => {
  process.env.BANNERS_ADMIN_SESSION_SECRET = 'z'.repeat(64);
  assert.throws(() => validateBannerAdminEnvironment(), error => error.variable === 'BANNERS_ADMIN_SESSION_SECRET' && !error.message.includes('z'.repeat(64)));
});

test('production rejects copied documentation placeholders for passwords and signing keys', () => {
  const env = { ...process.env, BANNERS_ADMIN_PASSWORD:'<your-private-password-of-at-least-8-characters>' };
  assert.throws(() => validateBannerAdminEnvironment({env,production:true}), /BANNERS_ADMIN_PASSWORD/);
  env.BANNERS_ADMIN_PASSWORD = 'private-test-password';
  env.BANNERS_ADMIN_SESSION_SECRET = '<persistent-random-secret-at-least-32-characters>';
  assert.throws(() => validateBannerAdminEnvironment({env,production:true}), /BANNERS_ADMIN_SESSION_SECRET/);
});

test('signed sessions reject tampering and credential rotation', () => {
  const token = session.createAdminToken();
  assert.equal(session.verifyAdminToken(token), true);
  assert.equal(session.verifyAdminToken(token + 'x'), false);
  assert.equal(session.checkAdminCredentials('fixture-admin', 'wrong-password'), false);
  process.env.BANNERS_ADMIN_PASSWORD = 'another-test-password';
  assert.equal(session.verifyAdminToken(token), false);
});

test('a fixed configuration verifies the same session in a fresh Node process', () => {
  const loader = path.resolve(__dirname, '../../auth/tests/auth-test-loader.cjs');
  const result = spawnSync(process.execPath, ['-e', "const load=require(process.argv[1]);const s=load('features/banners/server/admin-session.ts');let token='';process.stdin.on('data',c=>token+=c);process.stdin.on('end',()=>process.stdout.write(String(s.verifyAdminToken(token))));", loader], { env:{...process.env}, input:session.createAdminToken(), encoding:'utf8', timeout:10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'true');
});

test('login issues a protected production cookie and exposes no credentials', async () => {
  const response = await POST(request());
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=strict/i);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const body = await response.text();
  assert.ok(!body.includes(process.env.BANNERS_ADMIN_PASSWORD));
  assert.ok(!body.includes(process.env.BANNERS_ADMIN_SESSION_SECRET));
});

test('same-origin login supports the public HTTPS proxy origin and rejects unrelated origins', async () => {
  assert.equal((await POST(request(undefined, { Origin:'https://shop.example.test' }))).status, 200);
  assert.equal((await POST(request(undefined, { Origin:'https://evil.example' }))).status, 403);
  assert.equal((await POST(request(undefined, { 'Sec-Fetch-Site':'cross-site' }))).status, 403);
  assert.equal((await POST(request(undefined, { Origin:'https://other.example', 'X-Forwarded-Host':'other.example', 'X-Forwarded-Proto':'https' }))).status, 403);
});

test('login bounds streamed bodies and rejects incorrect content types or extra fields', async () => {
  assert.equal((await POST(request('x'.repeat(4097)))).status, 413);
  assert.equal((await POST(request(undefined, { 'Content-Type':'text/plain' }))).status, 415);
  assert.equal((await POST(request('{bad-json'))).status, 400);
  assert.equal((await POST(request({username:'fixture-admin',password:'private-test-password',role:'admin'}))).status, 400);
});

test('missing configuration cannot issue a cookie, and wrong passwords hit the attempt limit', async () => {
  delete process.env.BANNERS_ADMIN_PASSWORD;
  let response = await POST(request());
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('set-cookie'), null);
  process.env.BANNERS_ADMIN_PASSWORD = 'private-test-password';
  for (let i=0;i<8;i++) assert.equal((await POST(request({username:'fixture-admin',password:'wrong-password'}))).status, 401);
  response = await POST(request());
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get('retry-after')) > 0);
});
