import type { WooCommerceCartItem } from '../contracts';
export function cartText(value: string = '') {
  return value.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#0*39;|&apos;/g, "'").replace(/&quot;/g, '"');
}
export function money(amount: string | null | undefined, currency: { currency_minor_unit?: number; currency_code?: string; currency_symbol?: string }) {
  if (amount === null || amount === undefined) return 'پس از تعیین آدرس';
  const value = Number(amount) / 10 ** (currency.currency_minor_unit ?? 0);
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: currency.currency_minor_unit ?? 0 }).format(value) + ' ' + (currency.currency_code === 'IRT' ? 'تومان' : currency.currency_code === 'IRR' ? 'ریال' : currency.currency_symbol || currency.currency_code || '');
}
export function quantityStep(item: WooCommerceCartItem, direction: 1 | -1) {
  const limits = item.quantity_limits;
  const quantity = Number((item.quantity + direction * limits.multiple_of).toFixed(8));
  return limits.editable && quantity >= limits.minimum && quantity <= limits.maximum ? quantity : null;
}
export function cartItemPath(item: Pick<WooCommerceCartItem, 'permalink'>) {
  try {
    const segments = new URL(item.permalink).pathname.split('/').filter(Boolean);
    const slug = segments.at(-1);
    if (slug) return '/products/' + encodeURIComponent(decodeURIComponent(slug));
  } catch { /* Invalid backend links fall back to the catalog. */ }
  return '/products';
}

