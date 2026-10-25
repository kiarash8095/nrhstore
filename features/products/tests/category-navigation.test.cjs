/* eslint-disable @typescript-eslint/no-require-imports -- Standalone regression tests. */
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const load = require('../../auth/tests/auth-test-loader.cjs');
const { getHeaderCategories, getMainCategoryKey, findCategoryBySlug } = load('features/categories/constants/navigation.ts');
const { getMainCategories, getCategoriesWithId } = load('features/categories/api/categories.api.ts');
const originalFetch = global.fetch;
const originalMode = process.env.NODE_ENV;
const originalBase = process.env.NEXT_PUBLIC_BASE_URL;
afterEach(() => {
  global.fetch = originalFetch;
  if (originalMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalMode;
  if (originalBase === undefined) delete process.env.NEXT_PUBLIC_BASE_URL; else process.env.NEXT_PUBLIC_BASE_URL = originalBase;
});

const categories = [
  { id: 58, parent: 0, slug: 'network-equipment', name: 'شبکه' },
  { id: 57, parent: 0, slug: 'printers-scanners', name: 'اداری' },
  { id: 59, parent: 0, slug: 'accessories', name: 'جانبی' },
  { id: 365, parent: 0, slug: 'computer-hardware', name: 'قطعات' },
  { id: 55, parent: 0, slug: 'laptop', name: 'لپ‌تاپ' },
  { id: 79, parent: 57, slug: 'scanner', name: 'اسکنر' },
];

test('all five current WordPress categories survive filtering in development and production', () => {
  for (const mode of ['development', 'production']) {
    process.env.NODE_ENV = mode;
    const result = getHeaderCategories(categories);
    assert.deepEqual(result.map(item => item.id), [55, 365, 57, 58, 59]);
    assert.deepEqual(result.map(getMainCategoryKey), ['laptop', 'hardware', 'edari', 'network', 'accessory']);
    assert.deepEqual(result.map(item => item.slug), ['laptop', 'computer-hardware', 'printers-scanners', 'network-equipment', 'accessories']);
  }
});

test('renaming a slug preserves the menu and its actual destination without mutating source data', () => {
  const changed = categories.map(item => item.id === 365 ? { ...item, slug: 'new-hardware-url' } : item);
  assert.equal(getHeaderCategories(changed)[1].slug, 'new-hardware-url');
  assert.equal(findCategoryBySlug(changed, 'hardware').slug, 'new-hardware-url');
  assert.deepEqual(categories.map(item => item.id), [58, 57, 59, 365, 55, 79]);
});

test('aliases support changed IDs but do not import a child or invent a missing category', () => {
  const moved = categories.map(item => ({ ...item, id: item.id + 1000 }));
  assert.equal(getHeaderCategories(moved).length, 5);
  assert.equal(findCategoryBySlug(moved, 'network').slug, 'network-equipment');
  assert.equal(getHeaderCategories([{ id: 999, parent: 55, slug: 'accessories' }]).length, 0);
  assert.equal(findCategoryBySlug(categories, 'unrelated'), null);
});

test('a real exact slug takes precedence over a legacy alias', () => {
  const exact = { id: 888, parent: 0, slug: 'hardware', name: 'Exact category' };
  assert.equal(findCategoryBySlug([...categories, exact], 'hardware'), exact);
});

test('category reads have the same bounded cache policy and page size in both modes', async () => {
  process.env.NEXT_PUBLIC_BASE_URL = 'https://cms.example.test/wp-json/wc/store/v1';
  global.fetch = async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('per_page'), '100');
    assert.equal(parsed.searchParams.has('slug'), false, 'stable IDs must not be intersected with outdated slugs');
    assert.equal(options.next.revalidate, 300);
    assert.ok(options.next.tags.includes('catalog'));
    return new Response(JSON.stringify(categories));
  };
  for (const mode of ['development', 'production']) {
    process.env.NODE_ENV = mode;
    assert.equal((await getMainCategories([55, 365], ['laptop', 'hardware'])).length, categories.length);
    assert.equal((await getCategoriesWithId([55, 365])).length, categories.length);
  }
});
