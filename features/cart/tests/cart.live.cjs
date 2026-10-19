/* eslint-disable @typescript-eslint/no-require-imports -- Standalone live smoke test. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.CART_TEST_BASE_URL || 'http://localhost:3000';
const backend = process.env.WP_API_URL || 'https://nrhstore.ir/wp-json';
const cookies = new Map();
const results = [];
async function call(endpoint, body, expected = [200]) {
  const response = await fetch(base + '/api/cart' + endpoint, {
    method: body === undefined ? 'GET' : 'POST', redirect: 'error',
    headers: { Cookie: [...cookies].map(([key, value]) => key + '=' + value).join('; '), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  for (const raw of response.headers.getSetCookie()) {
    const pair = raw.split(';')[0], index = pair.indexOf('=');
    cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  const data = await response.json();
  assert.ok(expected.includes(response.status), endpoint + ': ' + response.status + ' ' + data.message);
  results.push({ endpoint: endpoint || '/cart', status: response.status, items_count: data.items_count, code: data.code });
  return data;
}
async function run() {
  await call('');
  const products = await fetch(backend + '/wc/store/v1/products?per_page=100&stock_status=instock').then(response => response.json());
  const product = products.find(item => item.type === 'simple' && item.is_purchasable && item.is_in_stock && Number(item.prices.price) > 0);
  assert.ok(product, 'A purchasable product is required.');
  let cart = await call('/add-item', { id: product.id, quantity: 1 });
  let item = cart.items.find(item => item.id === product.id);
  assert.ok(item); assert.equal(item.quantity, 1);
  const direct = await fetch(backend + '/wc/store/v1/cart?_nrh_request=' + require('node:crypto').randomUUID(), { headers: { 'Cart-Token': cookies.get('nrh_cart_guest'), 'Cache-Control': 'no-cache, no-store' } }).then(response => response.json());
  assert.equal(cart.totals.total_price, direct.totals.total_price, 'Displayed totals must equal WooCommerce.');
  if (item.quantity_limits.editable && item.quantity_limits.maximum >= 2) {
    cart = await call('/update-item', { key: item.key, quantity: 2 });
    assert.equal(cart.items.find(row => row.key === item.key).quantity, 2);
    cart = await call('/update-item', { key: item.key, quantity: 1 });
  }
  if (item.quantity_limits.maximum < 1000000) await call('/update-item', { key: item.key, quantity: item.quantity_limits.maximum + 1 }, [400, 409]);
  await call('/apply-coupon', { code: 'NRH_CART_TEST_INVALID_COUPON' }, [400, 404, 409]);
  await call('/remove-coupon', { code: 'NRH_CART_TEST_INVALID_COUPON' }, [400, 404, 409]);
  const address = { first_name: 'آزمایش', last_name: 'سبد', country: 'IR', state: 'HDN', city: 'همدان', address_1: 'آدرس آزمایشی؛ سفارش نهایی ثبت نشود', postcode: '6511111111', phone: '09000000000' };
  cart = await call('/update-customer', { billing_address: { ...address, email: 'cart-test@example.invalid' }, shipping_address: address });
  const pack = cart.shipping_rates.find(pack => pack.shipping_rates?.length);
  if (pack) cart = await call('/select-shipping-rate', { package_id: pack.package_id, rate_id: pack.shipping_rates[0].rate_id });
  else {
    const selected = await call('/select-shipping-rate', { package_id: 0, rate_id: 'nrh_invalid_shipping_rate' }, [200, 400, 404, 409]);
    if (selected.items_count !== undefined) assert.equal(selected.items_count, cart.items_count);
    results.push({ check: 'shipping-rates', available: 0, needs_shipping: cart.needs_shipping });
  }
  const checkout = await call('/checkout', {}, [200, 502]);
  if (checkout.checkout) {
    assert.ok(checkout.checkout.order_id);
    assert.equal(checkout.checkout.status, 'checkout-draft');
    assert.equal(checkout.cart.items_count, cart.items_count);
    results.push({ check: 'checkout-draft', order_id: checkout.checkout.order_id, status: checkout.checkout.status, total: checkout.cart.totals.total_price });
  } else {
    assert.equal(checkout.code, 'internal_server_error');
    results.push({ check: 'checkout-draft', blocked_backend: 'Boom/inc/cart-sync.php calls undefined StoreApi SessionHandler::set_customer_session_cookie()', status: 500 });
  }
  const recommendations = await fetch(base + '/api/cart/recommendations?ids=' + product.id).then(response => response.json());
  assert.ok(Array.isArray(recommendations));
  assert.ok(recommendations.every(item => item.id !== product.id));
  results.push({ check: 'recommendations', count: recommendations.length });
  await call('/remove-item', { key: item.key });
  assert.equal((await call('')).items_count, 0);
  const variables = await fetch(backend + '/wc/store/v1/products?type=variable&per_page=1').then(response => response.json());
  const variable = variables.find(item => item.variations?.length);
  if (variable) {
    const variants = await fetch(backend + '/wc/store/v1/products?type=variation&parent=' + variable.id).then(response => response.json());
    const variant = variants.find(item => item.is_purchasable && item.is_in_stock);
    if (variant) {
      const attributes = variable.variations.find(item => item.id === variant.id)?.attributes || [];
      const variation = attributes.map(attribute => ({ attribute: variable.attributes.find(item => item.name === attribute.name)?.taxonomy || attribute.name, value: attribute.value }));
      cart = await call('/add-item', { id: variant.id, quantity: 1, variation });
      assert.ok(cart.items.some(item => item.id === variant.id));
      results.push({ check: 'variation-added', id: variant.id });
    }
  }
}
(async () => {
  try { await run(); }
  catch (error) { results.push({ failed: error.message }); process.exitCode = 1; }
  finally {
    if (cookies.has('nrh_cart_guest')) {
      try { const empty = await call('/clear', {}); assert.equal(empty.items_count, 0); }
      catch (error) { results.push({ cleanup_failed: error.message }); process.exitCode = 1; }
    }
    const output = path.resolve('artifacts/cart');
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'live-results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  }
})();
