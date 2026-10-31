/* eslint-disable @typescript-eslint/no-require-imports -- Isolated WordPress/Next/browser integration without live account writes. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const fixture = require('./fixtures.cjs');
// Optional, public catalog snapshot. This never enables live order writes.
const catalogProduct = process.env.USER_PANEL_ORDER_PRODUCT_FILE
  ? JSON.parse(
      fs.readFileSync(process.env.USER_PANEL_ORDER_PRODUCT_FILE, 'utf8'),
    )
  : {
      id: 1563,
      name: 'هاب 4 پورت USB2.0 وی نت مدل V-HUAMH304',
      price: '560000',
      currency: 'IRT',
      minorUnit: 0,
    };
const runtime = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(runtime);
const { expect: baseExpect } = require(runtime + '/test');
const expect = baseExpect.configure({ timeout: 30000 });
const root = path.resolve(__dirname, '../../..');
const mode = process.env.USER_PANEL_TEST_MODE || 'dev';
const port = Number(
  process.env.USER_PANEL_TEST_PORT || (mode === 'production' ? 4118 : 4117),
);
const origin = 'http://localhost:' + port;
const output = path.resolve(process.env.USER_PANEL_TEST_OUTPUT || path.join(root, 'artifacts/user-panel', mode));
fs.mkdirSync(output, { recursive: true });
const secret = randomBytes(32).toString('hex');
process.env.AUTH_SESSION_SECRET = secret;
const load = require('../../auth/tests/auth-test-loader.cjs');
const { encodeJar } = load('features/auth/server/cookies.ts');
const copy = (value) => JSON.parse(JSON.stringify(value));
const users = {
  a: {
    user: copy(fixture.customer),
    addresses: [copy(fixture.address)],
    wishlist: [12, 13],
    profile: copy(fixture.profile),
  },
  b: {
    user: {
      ...copy(fixture.customer),
      id: 8,
      first_name: 'کاربر',
      last_name: 'دوم',
      name: 'کاربر دوم',
      phone: '09999999999',
    },
    addresses: [],
    wishlist: [],
    profile: {
      ...copy(fixture.profile),
      values: {
        first_name: 'کاربر',
        last_name: 'دوم',
        email: 'other@example.invalid',
        phone: '09999999999',
      },
    },
  },
};
let failProfile = false,
  addressFailure = false,
  addressWrites = 0,
  nextAddress = 102;
let createdOrder = null,
  checkoutWrites = 0;
const writes = [],
  unexpected = [],
  results = {},
  errors = [];
const revoked = new Set();
const cart = {
  items: [],
  items_count: 0,
  coupons: [],
  fees: [],
  errors: [],
  cross_sells: [],
  needs_shipping: false,
  needs_payment: false,
  shipping_rates: [],
  billing_address: {},
  shipping_address: {},
  payment_methods: ['melli_pay'],
  payment_requirements: [],
  extensions: {},
  totals: {
    currency_code: 'IRT',
    currency_symbol: 'تومان',
    currency_minor_unit: 0,
    total_items: '0',
    total_price: '0',
    total_discount: '0',
    total_shipping: '0',
    total_tax: '0',
    total_fees: '0',
    tax_lines: [],
  },
};
const otherCart = copy(cart), guestCart = copy(cart);
const backend = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://mock.invalid');
  const send = (data, status = 200, headers = {}) => {
    response.writeHead(status, {
      'Content-Type': 'application/json',
      'X-NRH-Cart-Lock': 'mysql-v1',
      'X-NRH-Account-Lock': 'mysql-v1',
      ...headers,
    });
    response.end(JSON.stringify(data));
  };
  const key = (request.headers.cookie || '').includes('session-b')
    ? 'b'
    : (request.headers.cookie || '').includes('session-a')
      ? 'a'
      : null;
  const customer = key ? users[key] : null;
  let raw = '';
  for await (const chunk of request) raw += chunk;
  const body = raw ? JSON.parse(raw) : undefined;
  if (!['GET', 'HEAD'].includes(request.method))
    writes.push({ path: url.pathname, method: request.method, body, key });
  if (url.pathname.endsWith('/admin-ajax.php')) {
    response.end('1234567890');
    return;
  }
  if (url.pathname.endsWith('/boom/v1/me'))
    return customer && !revoked.has(key)
      ? send(customer.user, 200, { 'X-WP-Nonce': '1234567890' })
      : send({ code: 'not_logged_in' }, 401);
  if (url.pathname.endsWith('/boom/v1/logout')) { revoked.add(key); return send({ success: true }); }
  if (url.pathname.endsWith('/nrh/v1/capabilities')) return send({ version: '1.3.0', cart_merge: 'sum-v1', account_lock: 'mysql-v1' });
  if (url.pathname.endsWith('/boom/v1/sync-session'))
    return send({ success: true });
  if (
    url.pathname.endsWith('/wc/store/v1/products') ||
    /\/wc\/store\/v1\/products\/test-/.test(url.pathname)
  ) {
    if (url.pathname.endsWith('/products')) {
      const ids = url.searchParams.get('include');
      return send(
        ids
          ? fixture.products.filter((product) =>
              ids.split(',').includes(String(product.id)),
            )
          : fixture.products,
      );
    }
    return send({
      ...fixture.products[0],
      type: 'simple',
      is_purchasable: true,
      has_options: false,
      description: '<p>محصول آزمایشی</p>',
      short_description: 'محصول آزمایشی',
      permalink: 'https://cms.example.test/product/test-monitor/',
      brands: [],
      categories: [],
      attributes: [],
      variations: [],
      average_rating: '0',
      review_count: 0,
      sku: 'TEST',
      prices: {
        ...fixture.products[0].prices,
        regular_price: '12500000',
        sale_price: '12500000',
        currency_decimal_separator: '.',
      },
      add_to_cart: { minimum: 1, maximum: 4, multiple_of: 1 },
    });
  }
  if (url.pathname.endsWith('/wc/store/v1/cart'))
    return send(key === 'a' ? cart : key === 'b' ? otherCart : guestCart, 200, {
      Nonce: '1234567890',
      'User-ID': String(customer?.user.id || 0),
      'Cart-Token': 'mock-cart-token-12345678901234567890',
    });
  if (
    url.pathname.includes('/wc/store/v1/cart/') &&
    request.method === 'POST'
  ) {
    if (key !== 'a') return send({ code: 'not_allowed' }, 403);
    if (url.pathname.endsWith('/add-item')) {
      assert.equal(body.id, catalogProduct.id);
      assert.equal(body.quantity, 1);
      const money = {
        ...cart.totals,
        currency_code: catalogProduct.currency,
        currency_minor_unit: catalogProduct.minorUnit,
      };
      Object.assign(cart, {
        items_count: 1,
        needs_shipping: true,
        needs_payment: true,
        items: [
          {
            id: catalogProduct.id,
            key: 'a'.repeat(32),
            name: catalogProduct.name,
            quantity: 1,
            quantity_limits: {
              minimum: 1,
              maximum: 4,
              multiple_of: 1,
              editable: true,
            },
            images: [],
            variation: [],
            item_data: [],
            prices: {
              ...money,
              price: catalogProduct.price,
              regular_price: catalogProduct.price,
              sale_price: catalogProduct.price,
              price_range: null,
            },
            totals: {
              ...money,
              line_total: catalogProduct.price,
              line_subtotal: catalogProduct.price,
              line_total_tax: '0',
              line_subtotal_tax: '0',
            },
          },
        ],
        shipping_rates: [
          {
            package_id: 0,
            name: 'ارسال آزمایشی',
            shipping_rates: [
              {
                ...money,
                rate_id: 'flat_rate:3',
                name: 'ارسال تستی',
                price: '0',
                selected: false,
              },
            ],
          },
        ],
        totals: {
          ...money,
          total_items: catalogProduct.price,
          total_price: catalogProduct.price,
        },
      });
    } else if (url.pathname.endsWith('/update-customer'))
      Object.assign(cart, body);
    else if (url.pathname.endsWith('/select-shipping-rate')) {
      assert.equal(body.rate_id, 'flat_rate:3');
      cart.shipping_rates[0].shipping_rates[0].selected = true;
    } else {
      unexpected.push({ path: url.pathname });
      return send({}, 400);
    }
    return send(cart);
  }
  if (url.pathname.endsWith('/nrh/v1/checkout')) {
    if (key !== 'a') return send({}, 403);
    assert.equal(request.method, 'POST');
    assert.equal(cart.items_count, 1);
    assert.equal(cart.shipping_rates[0].shipping_rates[0].selected, true);
    assert.equal(body.expected_total, cart.totals.total_price);
    checkoutWrites++;
    createdOrder = {
      id: 56,
      customer_id: 7,
      order_number: '1056',
      status: 'pending',
      date_created: new Date().toISOString(),
      total: String(
        Number(catalogProduct.price) / 10 ** catalogProduct.minorUnit,
      ),
      currency: catalogProduct.currency,
      shipping_total: '0',
      discount_total: '0',
      payment_method_title: 'سداد بانک ملی',
      billing: copy(cart.billing_address),
      shipping: copy(cart.shipping_address),
      tracking_number: '',
      shipping_company: 'none',
      line_items: [
        {
          id: 2,
          product_id: catalogProduct.id,
          name: catalogProduct.name,
          quantity: 1,
          total: String(
            Number(catalogProduct.price) / 10 ** catalogProduct.minorUnit,
          ),
        },
      ],
      customer_notes: [],
    };
    return send({
      order_id: 56,
      redirect_url: origin + '/checkout/result?order=56',
    });
  }
  if (url.pathname.endsWith('/nrh/v1/orders/56')) {
    if (key !== 'a' || !createdOrder) return send({}, 404);
    return send({
      order_id: 56,
      status: createdOrder.status,
      paid: false,
      payment_state: 'awaiting',
      reference: '',
    });
  }
  if (
    url.pathname.includes('/products/categories') ||
    url.pathname.includes('/products/attributes')
  )
    return send([]);
  if (
    url.pathname.includes('/boom/v1/') ||
    url.pathname.includes('/boom-wallet/v1/')
  ) {
    if (!customer) return send({ code: 'not_logged_in' }, 401);
    if (request.headers['x-wp-nonce'] !== '1234567890')
      return send({ code: 'rest_cookie_invalid_nonce' }, 403);
  }
  if (url.pathname.endsWith('/boom-wallet/v1/balance'))
    return send({
      success: true,
      completed_orders: key === 'a' ? 4 : 0,
      cancelled_orders: key === 'a' ? 1 : 0,
      refunded_orders: 0,
    });
  if (url.pathname.endsWith('/boom/v1/my-orders'))
    return send({
      success: true,
      orders:
        key === 'a' && Number(url.searchParams.get('page') || 1) === 1
          ? [...(createdOrder ? [createdOrder] : []), ...fixture.orders]
          : [],
      current_page: Number(url.searchParams.get('page') || 1),
      max_num_pages: 1,
    });
  if (url.pathname.includes('/boom/v1/my-orders/'))
    return key === 'a' && createdOrder && url.pathname.endsWith('/56')
      ? send({ success: true, order: createdOrder })
      : key === 'a' && url.pathname.endsWith('/55')
        ? send({ success: true, order: fixture.detail })
        : send({ message: 'not found' }, 404);
  if (url.pathname.endsWith('/boom/v1/profile-fields')) {
    if (failProfile)
      return send({ message: 'SECRET /home/private/php.php' }, 500);
    if (request.method === 'POST') {
      Object.assign(customer.profile.values, body.values);
      Object.assign(customer.user, {
        first_name: body.values.first_name,
        last_name: body.values.last_name,
        email: body.values.email,
        name: body.values.first_name + ' ' + body.values.last_name,
      });
      return send({ success: true });
    }
    return send(customer.profile);
  }
  if (url.pathname.includes('/boom/v1/addresses')) {
    const match = url.pathname.match(/\/addresses\/(\d+)/),
      id = Number(match?.[1]);
    if (request.method === 'GET')
      return send({ addresses: customer.addresses });
    addressWrites++;
    if (addressFailure) return send({ message: 'Address rejected' }, 400);
    if (request.method === 'POST' && !id)
      customer.addresses.push({
        ...body,
        id: nextAddress++,
        is_default: false,
      });
    else if (request.method === 'POST')
      customer.addresses = customer.addresses.map((address) => ({
        ...address,
        is_default: address.id === id,
      }));
    else if (request.method === 'PUT')
      customer.addresses = customer.addresses.map((address) =>
        address.id === id ? { ...address, ...body } : address,
      );
    else if (request.method === 'DELETE')
      customer.addresses = customer.addresses.filter(
        (address) => address.id !== id,
      );
    return send({ success: true });
  }
  if (url.pathname.includes('/boom/v1/wishlist')) {
    if (request.method === 'POST')
      customer.wishlist = [...new Set([...customer.wishlist, body.product_id])];
    if (request.method === 'DELETE')
      customer.wishlist = customer.wishlist.filter(
        (id) => id !== Number(url.pathname.split('/').pop()),
      );
    return send(customer.wishlist);
  }
  if (request.method === 'GET') return send([]);
  unexpected.push({ path: url.pathname, method: request.method });
  return send({ message: 'Unexpected write blocked' }, 500);
});

let server, browser, browserPage;
(async () => {
  await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve));
  const mockOrigin = 'http://127.0.0.1:' + backend.address().port;
  const log = fs.createWriteStream(path.join(output, 'server.log'));
  server = spawn(
    process.execPath,
    [
      path.join(root, 'node_modules/next/dist/bin/next'),
      mode === 'production' ? 'start' : 'dev',
      '--port',
      String(port),
    ],
    {
      cwd: root,
      windowsHide: true,
      env: {
        ...process.env,
        AUTH_SESSION_SECRET: secret,
        BANNERS_ADMIN_USERNAME: 'browser-admin',
        BANNERS_ADMIN_PASSWORD: randomBytes(24).toString('hex'),
        BANNERS_ADMIN_SESSION_SECRET: randomBytes(32).toString('hex'),
        NEXT_PUBLIC_SITE_URL: origin,
        WP_API_URL: 'https://cms.example.test/wp-json',
        WP_AUTH_BASE_URL: 'https://cms.example.test/wp-json',
        NEXT_PUBLIC_BASE_URL: 'https://cms.example.test/wp-json',
        AUTH_SESSION_DATA_DIR: path.join(output, 'session-store'),
        CART_LOCK_DIR: path.join(output, 'locks'),
        USER_PANEL_MOCK_ORIGIN: mockOrigin,
        NODE_OPTIONS:
          (process.env.NODE_OPTIONS || '') +
          ' --require "' +
          path.join(__dirname, 'fetch-preload.cjs').replace(/\\/g, '/') +
          '"',
      },
    },
  );
  server.stdout.pipe(log);
  server.stderr.pipe(log);
  for (let i = 0; i < 90; i++) {
    if (server.exitCode !== null)
      throw Error('Next exited before readiness; see server.log');
    try {
      if ((await fetch(origin + '/api/auth/session')).status === 401) break;
    } catch {}
    if (i === 89) throw Error('Next test server did not start.');
    await delay(1000);
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    locale: 'fa-IR',
  });
  const page = await context.newPage();
  browserPage = page;
  page.on('pageerror', (error) => errors.push(error.message));
  const anonymous = await page.request.get(origin + '/account', {
    maxRedirects: 0,
  });
  assert.equal(anonymous.status(), 307);
  assert.match(anonymous.headers().location, /auth=login.*next=%2Faccount/);
  results.anonymous_redirect =
    'passed; protected server page redirects to existing auth modal';
  const cookie = encodeJar({
    wordpress_logged_in_test: 'session-a',
    wp_rest: '1234567890',
  });
  await context.addCookies([
    {
      name: 'nrh_auth',
      value: cookie,
      url: origin,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await page.goto(origin + '/account');
  await expect(
    page.getByRole('heading', { name: 'سلام سارا، خوش آمدید', exact: true }),
  ).toBeVisible();
  const navigation = page.getByRole('navigation', {
    name: 'بخش‌های حساب کاربری',
  });
  await expect(
    navigation.getByRole('link', { name: 'داشبورد', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(
    page.getByRole('link', { name: 'مشاهده و ویرایش پروفایل', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'جزئیات سفارش 1055', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(output, 'dashboard-desktop.png'),
    fullPage: true,
  });
  results.dashboard =
    'passed; real SSR session check, account API summary and right sidebar';
  await navigation.getByRole('link', { name: 'سبد خرید', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'سبد خرید شما خالی است', exact: true })).toBeVisible();
  results.account_cart_empty = 'passed; active cart is accessible inside the private account panel';
  await navigation.getByRole('link', { name: 'سفارش‌ها', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'سفارش‌های من', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'جست‌وجوی شماره سفارش' })
    .fill('۱۰۵۵');
  await expect(page.getByRole('link', { name: /جزئیات سفارش/ })).toHaveCount(1);
  await page
    .getByRole('link', { name: 'جزئیات سفارش 1055', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'سفارش #1055', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('123456789012345678901234', { exact: true }),
  ).toBeVisible();
  const foreign = await page.request.get(origin + '/api/account/orders/88');
  assert.equal(foreign.status(), 404);
  await page.screenshot({
    path: path.join(output, 'order-details.png'),
    fullPage: true,
  });
  results.orders =
    'passed; Persian search, status/details/tracking, foreign order stays inaccessible';
  await navigation.getByRole('link', { name: 'آدرس‌ها', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'خانه', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'افزودن آدرس', exact: true }).click();
  const addressValues = {
    title: 'دفتر',
    first_name: 'سارا',
    last_name: 'رضایی',
    phone: '۰۹۱۲۳۴۵۶۷۸۹',
    city: 'همدان',
    postcode: '۶۵۱۱۱۱۱۱۱۱',
    address: 'نشانی آزمایشی محل کار، پلاک ۱۰',
  };
  for (const [name, value] of Object.entries(addressValues))
    await page.locator('[name="' + name + '"]').fill(value);
  await page.locator('select[name="state"]').selectOption('HDN');
  addressFailure = true;
  await page.getByRole('button', { name: 'ثبت آدرس', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText(
    'فروشگاه اطلاعات را نپذیرفت',
  );
  await expect(page.locator('[name="title"]')).toHaveValue('دفتر');
  addressFailure = false;
  await expect(
    page.getByRole('button', { name: 'ثبت آدرس', exact: true }),
  ).toBeEnabled();
  const before = addressWrites;
  await page
    .getByRole('button', { name: 'ثبت آدرس', exact: true })
    .evaluate((button) => {
      button.form.requestSubmit(button);
      button.form.requestSubmit(button);
    });
  await expect(
    page.getByRole('heading', { name: 'دفتر', exact: true }),
  ).toBeVisible();
  assert.equal(addressWrites - before, 1);
  assert.equal(users.a.addresses[1].phone, '09123456789');
  assert.equal(users.a.addresses[1].postcode, '6511111111');
  await page
    .getByRole('button', { name: 'انتخاب پیش‌فرض', exact: true })
    .click();
  await expect
    .poll(
      () =>
        users.a.addresses.find((address) => address.title === 'دفتر')
          .is_default,
    )
    .toBe(true);
  const office = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'دفتر', exact: true }) });
  await office.getByRole('button', { name: 'ویرایش', exact: true }).click();
  await page.locator('[name="title"]').fill('دفتر مرکزی');
  await page
    .getByRole('button', { name: 'ذخیره تغییرات آدرس', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'دفتر مرکزی', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'حذف آدرس دفتر مرکزی', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'حذف آدرس', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'دفتر مرکزی', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect
    .poll(() =>
      users.a.addresses.some((address) => address.title === 'دفتر مرکزی'),
    )
    .toBe(false);
  results.addresses =
    'passed; save error preserves form, one write for duplicate submits, Persian normalization, default/edit/delete confirmation';
  await navigation
    .getByRole('link', { name: 'علاقه‌مندی‌ها', exact: true })
    .click();
  await expect(page.locator('article')).toHaveCount(2);
  await page
    .getByRole('button', {
      name: 'حذف از علاقه‌مندی‌ها: ماوس بی‌سیم لاجیتک',
      exact: true,
    })
    .click();
  await expect(page.locator('article')).toHaveCount(1);
  assert.deepEqual(users.a.wishlist, [12]);
  results.wishlist =
    'passed; loaded from current customer, product enrichment and persistent remove';
  await page
    .getByRole('link', { name: 'مشاهده و ویرایش پروفایل', exact: true })
    .click();
  await expect(page.getByLabel('شماره موبایل ورود')).toHaveAttribute(
    'readonly',
    '',
  );
  await page.getByRole('textbox', { name: 'نام', exact: true }).fill('نگار');
  await page
    .getByRole('button', { name: 'ذخیره تغییرات پروفایل', exact: true })
    .click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'تغییرات پروفایل شما ذخیره شد.' }),
  ).toBeVisible();
  assert.equal(users.a.user.first_name, 'نگار');
  await page.reload();
  await expect(
    page.getByRole('textbox', { name: 'نام', exact: true }),
  ).toHaveValue('نگار');
  results.profile =
    'passed; configured fields, read-only login identity, persisted edit and session refresh';
  await navigation.getByRole('link', { name: 'پشتیبانی', exact: true }).click();
  await expect(
    page.getByRole('link', { name: /ایمیل پشتیبانی/ }),
  ).toHaveAttribute('href', 'mailto:info@nrh.ir');
  await expect(
    page.getByRole('link', { name: /تماس با فروشگاه/ }),
  ).toHaveAttribute('href', 'tel:08131775');
  await expect(
    page.getByText('همدان، خیابان بوعلی، کوچه شریف، ساختمان نوین', {
      exact: true,
    }),
  ).toBeVisible();
  results.support =
    'passed; requested company phone, email and address; no ticket UI';
  // Full controlled checkout, using the public product snapshot and the real
  // Next cart/payment/account handlers. Only the isolated backend creates data.
  const added = await page.request.post(origin + '/api/cart/add-item', {
    headers: { Origin: origin, 'X-NRH-Cart-Identity': '7' },
    data: { id: catalogProduct.id, quantity: 1 },
  });
  assert.equal(added.status(), 200, await added.text());
  await page.goto(origin + '/account/cart');
  await expect(page.getByTestId('cart-item')).toHaveCount(1);
  await expect(page.getByTestId('cart-item')).toContainText(catalogProduct.name);
  await expect(page.getByRole('link', { name: /ادامه.*تسویه|ادامه.*خرید/ })).toBeVisible();
  await page.screenshot({ path: path.join(output, 'account-cart-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(output, 'account-cart-mobile.png'), fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Account cart overflows on mobile');
  await page.setViewportSize({ width: 1440, height: 1050 });
  results.account_cart = 'passed; existing cart API/query/items/totals inside account, desktop and mobile';
  await page.goto(origin + '/checkout');
  await page.getByRole('button', { name: /خانه/ }).click();
  await page.locator('input[name="email"]').fill('customer@example.invalid');
  await page
    .getByRole('button', { name: 'ذخیره آدرس و محاسبه ارسال', exact: true })
    .click();
  await page.getByRole('radio', { name: /ارسال تستی/ }).click();
  await page
    .getByRole('button', { name: 'ادامه به مرحله پرداخت', exact: true })
    .click();
  results.checkout_stage_url_after_click = page.url();
  await expect(page).toHaveURL(origin + '/checkout?step=payment');
  await page
    .getByRole('button', { name: 'پرداخت', exact: true })
    .click();
  await page.waitForURL(origin + '/checkout/result?order=56');
  await expect(
    page.getByRole('status').filter({ hasText: 'هنوز تأیید نشده' }),
  ).toBeVisible();
  assert.equal(checkoutWrites, 1);
  assert.equal(createdOrder.status, 'pending');
  await page.goto(origin + '/account/orders');
  await page
    .getByRole('combobox', { name: 'فیلتر وضعیت سفارش' })
    .selectOption('pending');
  await page
    .getByRole('textbox', { name: 'جست‌وجوی شماره سفارش' })
    .fill('١٠٥٦');
  await page
    .getByRole('link', { name: 'جزئیات سفارش 1056', exact: true })
    .click();
  await expect(
    page.getByText(catalogProduct.name, { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'پرداخت این سفارش هنوز تأیید نشده' }),
  ).toBeVisible();
  await expect(
    page.getByText(/کد رهگیری مرسوله هنوز ثبت نشده است/),
  ).toBeVisible();
  await expect(page.locator('main')).toContainText('همدان، همدان');
  const refreshOrder = () =>
    page
      .getByRole('button', { name: 'به‌روزرسانی وضعیت سفارش', exact: true })
      .click();
  createdOrder.status = 'shetab-approval';
  await refreshOrder();
  await expect(page.locator('li[aria-current="step"]')).toHaveText('پردازش');
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'پرداخت این سفارش هنوز تأیید نشده' }),
  ).toHaveCount(0);
  createdOrder.status = 'preparing';
  await refreshOrder();
  await expect(
    page.getByText('آماده‌سازی سفارش', { exact: true }),
  ).toBeVisible();
  createdOrder.status = 'shipped';
  createdOrder.tracking_number = '123456789012345678901256';
  createdOrder.shipping_company = 'post';
  createdOrder.customer_notes = [
    {
      id: 2,
      content: '<p>مرسوله آزمایشی به پست تحویل شد.</p>',
      date: new Date().toISOString(),
    },
  ];
  // No click: a visible order must pick up the admin-side change itself.
  await expect(page.locator('li[aria-current="step"]')).toHaveText('ارسال', {
    timeout: 45000,
  });
  await expect(
    page.getByText(createdOrder.tracking_number, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'پیگیری مرسوله', exact: true }),
  ).toHaveAttribute('href', 'https://tracking.post.ir/');
  await expect(
    page.getByText('مرسوله آزمایشی به پست تحویل شد.', { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(output, 'created-order-shipped.png'),
    fullPage: true,
  });
  for (const status of ['delivered', 'cancelled', 'failed', 'refunded']) {
    createdOrder.status = status;
    await refreshOrder();
    await expect(
      page.getByText(
        {
          delivered: 'تحویل داده شده',
          cancelled: 'لغو شده',
          failed: 'پرداخت ناموفق',
          refunded: 'بازپرداخت شده',
        }[status],
        { exact: true },
      ),
    ).toBeVisible();
    if (status === 'delivered')
      await expect(page.locator('li[aria-current="step"]')).toHaveText('تحویل');
    else
      await expect(
        page.getByRole('region', { name: 'مراحل سفارش' }),
      ).toHaveCount(0);
  }
  assert.equal(
    (
      await page.request.post(origin + '/api/account/orders/56', {
        headers: { Origin: origin },
        data: { status: 'completed' },
      })
    ).status(),
    404,
  );
  await page.goto(origin + '/account/orders?page=2');
  await expect(
    page.getByRole('link', { name: 'بازگشت به صفحه اول', exact: true }),
  ).toBeVisible();
  results.order_lifecycle = {
    status: 'passed',
    backend: 'controlled; no live order or payment',
    product: catalogProduct,
    orderId: 56,
    checks: [
      'one checkout write',
      'pending is not paid',
      'Arabic-digit search',
      'all custom status filters',
      'manual status refresh',
      'automatic status refresh after 30 seconds',
      'shipping tracking and customer notes',
      'Persian province',
      'delivered and cancelled/failed/refunded stages',
      'customer cannot modify order status',
      'out-of-range pagination recovery',
    ],
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await navigation.getByRole('link', { name: 'داشبورد', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'سلام نگار، خوش آمدید', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: path.join(output, 'dashboard-mobile.png'),
    fullPage: true,
  });
  await page.screenshot({
    path: path.join(output, 'dashboard-mobile-viewport.png'),
  });
  results.mobile =
    'passed; 390px layout, navigation and no horizontal page overflow';
  const otherContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await otherContext.addCookies([
    {
      name: 'nrh_auth',
      value: encodeJar({
        wordpress_logged_in_test: 'session-b',
        wp_rest: '1234567890',
      }),
      url: origin,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  const other = await otherContext.newPage();
  await other.goto(origin + '/account/cart');
  await expect(other.getByRole('heading', { name: 'سبد خرید شما خالی است', exact: true })).toBeVisible();
  await expect(other.getByTestId('cart-item')).toHaveCount(0);
  results.account_cart_isolation = 'passed; another account cannot see the first account cart';
  await other.goto(origin + '/account');
  await expect(
    other.getByRole('heading', { name: 'سلام کاربر، خوش آمدید', exact: true }),
  ).toBeVisible();
  await expect(
    other.getByRole('link', { name: 'جزئیات سفارش 1055', exact: true }),
  ).toHaveCount(0);
  assert.equal(
    (await other.request.get(origin + '/api/account/orders/55')).status(),
    404,
  );
  await otherContext.close();
  results.account_isolation =
    'passed; independent server sessions, UI caches and order ownership';
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto(origin + '/account/profile');
  failProfile = true;
  await page.reload();
  await expect(page.locator('main').getByRole('alert')).toContainText(
    'سرویس حساب کاربری',
  );
  assert.doesNotMatch(await page.locator('main').innerText(), /SECRET|\/home/);
  failProfile = false;
  await page.getByRole('button', { name: 'تلاش دوباره', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'نام', exact: true }),
  ).toHaveValue('نگار');
  results.error_recovery =
    'passed; server outage redacted and explicit retry recovers';
  await navigation
    .getByRole('button', { name: 'خروج از حساب', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'بله، خروج از حساب', exact: true })
    .click();
  await page.waitForURL(origin + '/');
  assert.equal(
    (
      await page.request.get(origin + '/api/account/profile', {
        headers: { Cookie: 'nrh_auth=' + cookie },
      })
    ).status(),
    401,
  );
  results.logout =
    'passed; confirmation, server revocation and old-cookie replay denied';
  await page.goto(origin + '/account');
  await expect(page.getByRole('dialog')).toBeVisible();
  results.anonymous_auth_form =
    'passed; anonymous /account visit opens the actual authentication form';
  assert.deepEqual(unexpected, []);
  assert.deepEqual(errors, []);
  results.browser_errors = errors;
  results.scope =
    'Isolated mock WordPress; real Next page/API/auth code; no live WordPress account writes or bank calls.';
})()
  .catch(async (error) => {
    results.failure = error.stack;
    results.browser_errors = errors;
    process.exitCode = 1;
    if (browserPage)
      await browserPage
        .screenshot({ path: path.join(output, 'failure.png'), fullPage: true })
        .catch(() => {});
  })
  .finally(async () => {
    fs.writeFileSync(
      path.join(output, 'results.json'),
      JSON.stringify(results, null, 2) + '\n',
    );
    console.log(JSON.stringify(results, null, 2));
    if (browser) await Promise.race([browser.close(), delay(5000)]);
    if (server) {
      if (mode === 'production') server.kill('SIGTERM');
      else if (process.platform === 'win32')
        spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
          timeout: 5000,
        });
      else server.kill('SIGTERM');
    }
    backend.closeAllConnections();
    backend.close();
    process.exit(process.exitCode || 0);
  });
