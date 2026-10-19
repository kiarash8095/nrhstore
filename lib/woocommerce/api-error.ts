export class WooCommerceApiError extends Error {
  constructor(public readonly status: number, public readonly code = 'woocommerce_unavailable') {
    super('WooCommerce request failed.');
    this.name = 'WooCommerceApiError';
  }
}
