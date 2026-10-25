// Explicit opt-in: these tests can mutate real carts/accounts or send SMS.
if (process.env.NRH_ALLOW_LIVE_MUTATIONS !== '1') {
  console.error('Live mutations are disabled. Set NRH_ALLOW_LIVE_MUTATIONS=1 only with authorization for a dedicated test environment.');
  process.exit(2);
}
/* eslint-disable @typescript-eslint/no-require-imports -- Live audit using one isolated guest cart only. */
// No account cookies, checkout, payment, or production configuration are used.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const origin = process.env.RACE_TEST_URL || 'http://localhost:3000';
const results = [];
let cookie = '';
async function request(endpoint, body, guest = cookie) {
  const response = await fetch(origin + '/api/cart' + endpoint, {
    method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(45000),
    headers: { Cookie: guest, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const token = response.headers.getSetCookie().find(value => value.startsWith('nrh_cart_guest='));
  const data = await response.json();
  return { status: response.status, data, cookie: token ? token.split(';')[0] : guest };
}
async function run() {
  const initial = await request('', undefined, '');
  assert.equal(initial.status, 200); cookie = initial.cookie;
  const response = await fetch(origin + '/api/catalog/products?per_page=100', { signal: AbortSignal.timeout(45000) });
  assert.equal(response.status, 200);
  const products = await response.json();
  const product = products.find(item => item.type === 'simple' && item.is_purchasable && item.is_in_stock && Number(item.prices.price) > 0 && item.add_to_cart?.maximum >= 3 && item.add_to_cart?.minimum === 1);
  assert.ok(product, 'A simple product permitting at least three units is needed.');
  let added = await request('/add-item', { id: product.id, quantity: 1 });
  assert.equal(added.status, 200); cookie = added.cookie;
  const key = added.data.items.find(item => item.id === product.id).key;
  const trials = Math.max(1, Math.min(10, Number(process.env.RACE_TRIALS) || 3));
  for (let trial = 1; trial <= trials; trial++) {
    const reset = await request('/update-item', { key, quantity: 1 });
    assert.equal(reset.status, 200); cookie = reset.cookie;
    const responses = await Promise.all([request('/add-item', { id: product.id, quantity: 1 }), request('/add-item', { id: product.id, quantity: 1 })]);
    const final = await request('');
    assert.equal(final.status, 200);
    const actual = final.data.items.find(item => item.id === product.id)?.quantity;
    // A second read distinguishes a persistent lost update from a short read-after-write delay.
    await new Promise(resolve => setTimeout(resolve, 700));
    const settled = await request(''); assert.equal(settled.status, 200);
    const settledQuantity = settled.data.items.find(item => item.id === product.id)?.quantity;
    results.push({ id: 'two-tabs-add-trial-' + trial, status: responses.every(result => result.status === 200) ? actual === 3 && settledQuantity === 3 ? 'passed' : 'race-confirmed' : 'upstream-rejected-overlap', productId: product.id, expectedQuantity: 3, actualQuantity: actual, settledQuantity, responseStatuses: responses.map(item => item.status), responseQuantities: responses.map(item => item.data.items?.find(row => row.id === product.id)?.quantity) });
    console.log(JSON.stringify(results.at(-1)));
    if (responses.every(result => result.status === 200) && settledQuantity !== 3) break;
  }
}
run().catch(error => results.push({ status: 'test-error', message: error.message })).finally(async () => {
  if (cookie) {
    try { const cleared = await request('/clear', {}); results.push({ id: 'isolated-guest-cleanup', status: cleared.status === 200 && cleared.data.items_count === 0 ? 'passed' : 'test-error', responseStatus: cleared.status }); }
    catch (error) { results.push({ id: 'isolated-guest-cleanup', status: 'test-error', message: error.message }); }
  }
  const output = path.resolve(process.env.RACE_REPORT_DIR || 'artifacts/race-conditions'); await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'live-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  process.exitCode = results.some(item => item.status !== 'passed') ? 1 : 0;
});
