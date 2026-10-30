/* eslint-disable @typescript-eslint/no-require-imports -- Standalone test runner. */
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const load = require('../../auth/tests/auth-test-loader.cjs');
process.env.NEXT_PUBLIC_SITE_URL = 'https://shop.example.test';
process.env.WP_API_URL = 'https://cms.example.test/wp-json';
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const urls = load('lib/urls.ts');
const { getStoreApiUrl } = load('lib/wordpress/config.ts');
const { getProductCollection, getProductCardCollection, getProductDetails } = load('features/products/api/products.api.ts');
const { getAllCategories } = load('features/categories/api/categories.api.ts');
const { getCategoryBySlug, getSpecificCategory } = load('features/categories/api/category.api.ts');
const { productStructuredData } = load('features/products/seo/structured-data.ts');
const json = (data, headers = {}, status = 200) => new Response(JSON.stringify(data), { status, headers });
const product = { id: 12, name: 'Laptop', slug: 'laptop', description: '<p>Details</p>', images: [], brands: [], is_in_stock: true,
  prices: { price: '250000', currency_code: 'IRT', currency_minor_unit: 0 }, average_rating: '4.5', review_count: 3 };

test('frontend URLs are independent of backend permalinks and preserve Persian slugs', () => {
  assert.equal(getStoreApiUrl(), 'https://cms.example.test/wp-json/wc/store/v1');
  assert.equal(urls.productPath('%D9%85%D9%88%D8%B3'), '/products/%D9%85%D9%88%D8%B3');
  assert.equal(urls.categoryPath('laptop'), '/products/category/laptop');
  assert.equal(urls.pagePath('/products', 1), '/products');
  assert.equal(urls.pagePath('/products', 2), '/products?page=2');
  for (const value of ['0', '-1', '2x', '1.5', ['1', '2']]) assert.equal(urls.parsePage(value), null);
});

test('pagination preserves upstream counts and catalog cache tags', async () => {
  global.fetch = async (url, options) => {
    assert.equal(String(url), 'https://cms.example.test/wp-json/wc/store/v1/products?page=2&per_page=20&category=55');
    assert.ok(options.next.tags.includes('catalog'));
    assert.equal(options.redirect, 'error');
    return json([product], { 'X-WP-Total': '47', 'X-WP-TotalPages': '3' });
  };
  const data = await getProductCollection(2, 55);
  assert.equal(data.total, 47);
  assert.equal(data.totalPages, 3);
});

test('card collections keep images, prices and pagination without requesting product descriptions', async () => {
  const card = {
    id: product.id, name: product.name, slug: product.slug,
    images: [{ id: 1, src: 'https://cms.example.test/laptop.webp', name: 'Laptop' }],
    prices: product.prices, is_in_stock: true, average_rating: '4.5', review_count: 3,
  };
  global.fetch = async (url, options) => {
    const query = new URL(url).searchParams;
    const fields = query.get('_fields').split(',');
    assert.equal(query.get('page'), '2');
    assert.equal(query.get('category'), '55');
    assert.equal(query.get('per_page'), '20');
    assert.ok(fields.includes('images'), 'keep complete image arrays for WordPress compatibility');
    assert.ok(fields.includes('prices'));
    assert.ok(!fields.includes('description'));
    assert.ok(!fields.includes('attributes'));
    assert.equal(options.next.revalidate, 300);
    assert.ok(options.next.tags.includes('catalog'));
    return json([card], { 'X-WP-Total': '47', 'X-WP-TotalPages': '3' });
  };
  const data = await getProductCardCollection(2, 55);
  assert.deepEqual(data.items, [card]);
  assert.equal(data.total, 47);
  assert.equal(data.totalPages, 3);
  assert.equal(data.page, 2);
});

test('a missing product is not confused with backend failure', async () => {
  global.fetch = async () => json({ code: 'not_found' }, {}, 404);
  assert.equal(await getProductDetails('missing'), null);
  global.fetch = async () => json({ code: 'database_down' }, {}, 503);
  await assert.rejects(getProductDetails('unavailable'), error => error.status === 503);
  assert.equal(await getProductDetails('../cart'), null);
});

test('all categories are paginated and lookups return an object, not an array', async () => {
  global.fetch = async url => String(url).includes('page=2') ? json([{ id: 222, slug: 'mouse', name: 'Mouse' }]) :
    json([{ id: 55, slug: 'laptop', name: 'Laptop' }], { 'X-WP-TotalPages': '2' });
  assert.equal((await getAllCategories()).length, 2);
  assert.equal((await getCategoryBySlug('mouse')).id, 222);
  assert.equal((await getSpecificCategory(55)).name, 'Laptop');
  assert.equal(await getCategoryBySlug('missing'), null);
});

test('structured data converts toman correctly and does not invent prices or ratings', () => {
  const data = productStructuredData(product);
  assert.equal(data.offers.priceCurrency, 'IRR');
  assert.equal(data.offers.price, 2500000);
  assert.equal(data.offers.url, 'https://shop.example.test/products/laptop');
  assert.equal(data.aggregateRating.ratingValue, 4.5);
  assert.equal(productStructuredData({ ...product, prices: { ...product.prices, currency_minor_unit: 2 } }).offers.price, 25000);
  const unknown = productStructuredData({ ...product, prices: { price: '0' }, review_count: 0 });
  assert.equal(unknown.offers, undefined);
  assert.equal(unknown.aggregateRating, undefined);
});
