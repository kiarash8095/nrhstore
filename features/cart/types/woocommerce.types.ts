// lib/woocommerce/woocommerce.types.ts

export interface WooCommerceCart {
  account_sync_pending?: boolean;
  items: WooCommerceCartItem[];
  coupons: WooCommerceCartCoupon[];
  fees: WooCommerceCartFee[];

  totals: WooCommerceCartTotals;

  shipping_address: WooCommerceAddress;
  billing_address: WooCommerceBillingAddress;

  needs_payment: boolean;
  needs_shipping: boolean;

  payment_requirements: WooCommercePaymentRequirement[];

  has_calculated_shipping: boolean;

  shipping_rates: WooCommerceShippingRate[];

  items_count: number;
  items_weight: number;

  cross_sells: WooCommerceCrossSell[];

  errors: WooCommerceCartError[];

  payment_methods: string[];

  extensions: Record<string, unknown>;
}

export interface WooCommerceCartItem {
  key: string;
  id: number;

  quantity: number;

  quantity_limits: WooCommerceQuantityLimits;

  name: string;

  short_description: string;
  description: string;

  sku: string;

  low_stock_remaining: number | null;

  backorders_allowed: boolean;
  sold_individually: boolean;

  permalink: string;

  images: WooCommerceProductImage[];

  variation: WooCommerceVariation[];

  item_data: WooCommerceItemData[];

  prices: WooCommerceProductPrices;

  totals: WooCommerceCartItemTotals;

  catalog_visibility?: string;
}

export interface WooCommerceQuantityLimits {
  minimum: number;
  maximum: number;
  multiple_of: number;
  editable: boolean;
}

export interface WooCommerceVariation {
  attribute: string;
  value: string;
}

export interface WooCommerceItemData {
  key: string;
  value: string;
  display?: string;
}

export interface WooCommerceProductPrices {
  price: string;
  regular_price: string;
  sale_price: string;

  price_range: {
    min_amount?: string;
    max_amount?: string;
  } | null;

  currency_code: string;
  currency_symbol: string;

  currency_minor_unit: number;

  currency_decimal_separator: string;
  currency_thousand_separator: string;

  currency_prefix: string;
  currency_suffix: string;
}

export interface WooCommerceCartItemTotals {
  line_subtotal: string;
  line_subtotal_tax: string;

  line_total: string;
  line_total_tax: string;

  currency_code: string;
  currency_symbol: string;

  currency_minor_unit: number;

  currency_decimal_separator: string;
  currency_thousand_separator: string;

  currency_prefix: string;
  currency_suffix: string;
}

export interface WooCommerceCartTotals {
  total_items: string;
  total_items_tax: string;

  total_fees: string;
  total_fees_tax: string;

  total_discount: string;
  total_discount_tax: string;

  total_shipping: string | null;
  total_shipping_tax: string | null;

  total_price: string;
  total_tax: string;

  tax_lines: WooCommerceTaxLine[];

  currency_code: string;
  currency_symbol: string;

  currency_minor_unit: number;

  currency_decimal_separator: string;
  currency_thousand_separator: string;

  currency_prefix: string;
  currency_suffix: string;
}

export interface WooCommerceTaxLine {
  name?: string;
  price?: string;
  rate?: string;
  compound?: boolean;
  tax_total?: string;
  shipping_tax_total?: string;
}

export interface WooCommerceAddress {
  first_name: string;
  last_name: string;

  company: string;

  address_1: string;
  address_2: string;

  city: string;
  state: string;
  postcode: string;
  country: string;

  phone: string;
}

export interface WooCommerceBillingAddress
  extends WooCommerceAddress {
  email?: string;
}

export interface WooCommerceCartCoupon {
  code: string;

  discount_type?: string;

  totals?: {
    total_discount: string;
    total_discount_tax: string;
  };
}

export interface WooCommerceCartFee {
  name: string;

  totals?: {
    total: string;
    total_tax: string;
  };
}

export interface WooCommerceShippingRate {
  package_id?: string | number;

  name?: string;

  destination?: WooCommerceAddress;

  items?: WooCommerceShippingRateItem[];

  shipping_rates?: WooCommerceShippingMethod[];
}

export interface WooCommerceShippingRateItem {
  key?: string;
  name?: string;
  quantity?: number;
}

export interface WooCommerceShippingMethod {
  rate_id?: string;
  name?: string;
  description?: string;

  price?: string;

  taxes?: Record<string, string>;

  selected?: boolean;
}

export interface WooCommerceCrossSell {
  id: number;
  name?: string;
  permalink?: string;
  images?: WooCommerceProductImage[];
}

export interface WooCommerceProductImage {
  id: number;

  src: string;
  thumbnail?: string;
  srcset?: string;
  sizes?: string;

  name?: string;
  alt?: string;
}

export interface WooCommerceCartError {
  code: string;
  message: string;
  type?: string;
}

export type WooCommercePaymentRequirement =
  | "products"
  | "fees"
  | "shipping"
  | string;
