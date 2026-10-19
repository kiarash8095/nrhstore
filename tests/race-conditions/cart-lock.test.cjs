/* eslint-disable @typescript-eslint/no-require-imports -- Tests real locks across separate Node processes. */
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { fork } = require('node:child_process');
const load = require('../../features/auth/tests/auth-test-loader.cjs');
const { withCartLocks, cartTokenIdentity } = load('features/cart/server/cart-lock.ts');

if (process.argv[2] === 'worker') {
  const directory = process.argv[3];
  process.env.CART_LOCK_DIR = path.join(directory, 'locks');
  withCartLocks(['shared-test-cart'], async () => {
    const file = path.join(directory, 'counter.json');
    const count = JSON.parse(await fs.readFile(file, 'utf8'));
    await new Promise(resolve => setTimeout(resolve, 80));
    await fs.writeFile(file, JSON.stringify(count + 1));
  }).then(() => process.exit(0), error => { console.error(error); process.exit(1); });
} else {
  const { test, after } = require('node:test');
  const assert = require('node:assert/strict');
  const directory = path.resolve('.next', 'cart-lock-test-' + randomUUID());
  process.env.CART_LOCK_DIR = path.join(directory, 'locks');
  after(async () => {
    await fs.unlink(path.join(directory, 'counter.json')).catch(() => {});
    await fs.rmdir(path.join(directory, 'locks')).catch(() => {});
    await fs.rmdir(directory).catch(() => {});
  });
  test('separate Node workers preserve both writes to the same cart', async () => {
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'counter.json'), '0');
    const worker = () => new Promise((resolve, reject) => {
      const child = fork(__filename, ['worker', directory], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
      let errors = ''; child.stderr.on('data', chunk => { errors += chunk; });
      child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(errors || 'Worker failed: ' + code)));
    });
    await Promise.all([worker(), worker()]);
    assert.equal(JSON.parse(await fs.readFile(path.join(directory, 'counter.json'), 'utf8')), 2);
  });
  test('failed work releases its locks, including when acquiring multiple identities', async () => {
    await assert.rejects(withCartLocks(['one', 'two'], async () => { throw new Error('upstream failure'); }), /upstream failure/);
    assert.equal(await withCartLocks(['two', 'one'], async () => 7), 7);
    assert.deepEqual(await fs.readdir(path.join(directory, 'locks')), []);
  });
  test('rotated WooCommerce tokens for one session use the same mutex identity', () => {
    const token = expires => 'header.' + Buffer.from(JSON.stringify({ iss: 'store-api', user_id: 't_session_123', exp: expires })).toString('base64url') + '.signature';
    assert.equal(cartTokenIdentity(token(100)), cartTokenIdentity(token(200)));
    assert.notEqual(cartTokenIdentity(token(100)), cartTokenIdentity('another-opaque-token'));
  });
}
