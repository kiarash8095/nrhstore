/* eslint-disable @typescript-eslint/no-require-imports -- Reproducible CPU/request-budget benchmark. */
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const load = require('../../auth/tests/auth-test-loader.cjs');
const { checkoutSnapshot } = load('features/cart/utils/checkout.ts');
const items = Array.from({ length: 200 }, (_, id) => ({ key: String(id).padStart(32, '0'), id, quantity: 2, totals: { line_total: '250000' } }));
const cart = { items, coupons: [], fees: [], totals: { total_price: '50000000' }, billing_address: {}, shipping_address: {}, shipping_rates: [] };
const durations = [];
for (let i = 0; i < 2000; i++) {
  const start = performance.now();
  createHash('sha256').update(checkoutSnapshot(cart)).digest('hex');
  durations.push(performance.now() - start);
}
durations.sort((a, b) => a - b);
const p95 = durations[Math.floor(durations.length * .95)];
assert.ok(p95 < 25, `Snapshot CPU p95 exceeded 25 ms: ${p95}`);
const result = { scope: 'local CPU only; excludes WordPress, database, network and bank', items: items.length, samples: durations.length, snapshot_hash_p95_ms: p95, budget_ms: 25 };
const dir = path.resolve('artifacts/payments'); fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'performance.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
