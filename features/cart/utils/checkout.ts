import type { WooCommerceCart } from '../contracts';

/** Same canonical snapshot in browser and server; includes more than the total. */
export function checkoutSnapshot(cart: WooCommerceCart): string {
  return JSON.stringify({
    items: cart.items.map(item => [item.key, item.id, item.quantity, item.totals]).sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'en')),
    coupons: cart.coupons, fees: cart.fees, totals: cart.totals,
    billing: cart.billing_address, shipping: cart.shipping_address,
    rates: cart.shipping_rates.map(pack => [pack.package_id, pack.shipping_rates?.filter(rate => rate.selected).map(rate => [rate.rate_id, rate.price])]),
  });
}

export function allowedPaymentRedirect(value: string, origin: string, orderId: number): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.hash) return false;
    if (url.origin === 'https://sadad.shaparak.ir' && url.pathname === '/VPG/Purchase') {
      return [...url.searchParams.keys()].length === 1 && /^[a-zA-Z0-9+/_=-]{8,512}$/.test(url.searchParams.get('Token') || '');
    }
    return url.origin === origin && url.pathname === '/checkout/result' &&
      [...url.searchParams.keys()].length === 1 && url.searchParams.get('order') === String(orderId);
  } catch { return false; }
}
