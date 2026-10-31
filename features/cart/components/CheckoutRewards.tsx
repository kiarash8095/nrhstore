import { Gift } from 'lucide-react';
import type { WooCommerceCart } from '../contracts';
import { money } from '../utils/cart.utils';

export function CheckoutRewards({ cart }: { cart: WooCommerceCart }) {
  const amount = cart.nrh_checkout?.cashback;
  if (!amount || !/^\d+$/.test(amount) || Number(amount) <= 0) return null;
  return <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm leading-7 text-emerald-900"><Gift className="mt-1 size-5 shrink-0" /><p>پاداش این سفارش: <strong>{money(amount, cart.totals)}</strong><span className="mt-1 block text-xs text-emerald-800">پس از تأیید شرایط سفارش توسط فروشگاه، بازگشت نقدی طبق برنامهٔ کیف پول ثبت می‌شود. این مبلغ از جمع فعلی سفارش کم نشده است.</span></p></div>;
}
