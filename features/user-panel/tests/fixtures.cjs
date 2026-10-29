const customer = {
  id: 7,
  name: 'سارا رضایی',
  first_name: 'سارا',
  last_name: 'رضایی',
  phone: '09123456789',
  email: 'customer@example.invalid',
  slug: '09123456789',
};
const address = {
  id: 101,
  title: 'خانه',
  first_name: 'سارا',
  last_name: 'رضایی',
  phone: '09123456789',
  state: 'HDN',
  city: 'همدان',
  address: 'خیابان آزمایشی، کوچه نمونه، پلاک ۱۲، واحد ۲',
  postcode: '6511111111',
  is_default: true,
};
const profile = {
  fields: [
    { key: 'first_name', label: 'نام', type: 'text', required: true },
    { key: 'last_name', label: 'نام خانوادگی', type: 'text', required: true },
    { key: 'email', label: 'ایمیل', type: 'email', required: true },
    { key: 'phone', label: 'شماره موبایل ورود', type: 'tel', required: true },
  ],
  values: {
    first_name: customer.first_name,
    last_name: customer.last_name,
    email: customer.email,
    phone: customer.phone,
  },
};
const orders = [
  {
    id: 55,
    customer_id: 7,
    order_number: '1055',
    status: 'processing',
    date_created: '2026-10-25T10:30:00',
    total: '12500000',
    currency: 'IRT',
  },
  {
    id: 54,
    customer_id: 7,
    order_number: '1054',
    status: 'completed',
    date_created: '2026-10-20T10:30:00',
    total: '2450000',
    currency: 'IRT',
  },
  {
    id: 53,
    customer_id: 7,
    order_number: '1053',
    status: 'cancelled',
    date_created: '2026-10-15T10:30:00',
    total: '850000',
    currency: 'IRT',
  },
];
const detail = {
  ...orders[0],
  shipping_total: '50000',
  discount_total: '150000',
  payment_method_title: 'سداد بانک ملی',
  tracking_number: '123456789012345678901234',
  shipping_company: 'post',
  billing: { ...address, address_1: address.address, address_2: '' },
  shipping: { ...address, address_1: address.address, address_2: '' },
  line_items: [
    {
      id: 1,
      product_id: 12,
      name: 'مانیتور ۲۴ اینچ ایسوس',
      quantity: 1,
      total: '12500000',
    },
  ],
  customer_notes: [
    {
      id: 1,
      content: '<p>سفارش شما در حال آماده‌سازی است.</p>',
      date: '2026-10-25T11:00:00',
    },
  ],
};
const products = [
  {
    id: 12,
    name: 'مانیتور ۲۴ اینچ ایسوس',
    slug: 'test-monitor',
    is_in_stock: true,
    images: [],
    prices: { price: '12500000', currency_code: 'IRT', currency_minor_unit: 0 },
  },
  {
    id: 13,
    name: 'ماوس بی‌سیم لاجیتک',
    slug: 'test-mouse',
    is_in_stock: true,
    images: [],
    prices: { price: '850000', currency_code: 'IRT', currency_minor_unit: 0 },
  },
];
module.exports = { customer, address, profile, orders, detail, products };
