import Link from 'next/link';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import type { WooCommerceCart } from '../contracts';
import { money } from '../utils/cart.utils';
export function CartSummary({ cart, busy = false, checkout = false }: { cart: WooCommerceCart; busy?: boolean; checkout?: boolean }) {
  const totals = cart.totals;
  const rows = [['جمع کالاها', totals.total_items], ['تخفیف', totals.total_discount], ['هزینه ارسال', totals.total_shipping], ['مالیات', totals.total_tax], ['هزینه‌های دیگر', totals.total_fees]]
    .filter(([label, amount]) => label === 'جمع کالاها' || (label === 'هزینه ارسال' && cart.needs_shipping) || Number(amount) > 0);
  return <section className="rounded-2xl border border-gray-200 bg-white p-5">
    <h2 className="mb-5 text-base font-bold">خلاصه سفارش <span className="text-xs font-normal text-gray-400">({cart.items_count.toLocaleString('fa-IR')} کالا)</span></h2>
    <dl className="space-y-4 text-sm">{rows.map(([label, amount]) => <div key={label} className="flex items-center justify-between gap-3"><dt className="text-gray-500">{label}</dt><dd className={label === 'تخفیف' ? 'text-emerald-600' : ''}>{money(amount, totals)}</dd></div>)}</dl>
    <div className="mt-5 flex items-center justify-between gap-2 border-t border-dashed border-gray-200 pt-5 text-sm"><span>مبلغ قابل پرداخت</span><strong className="text-base">{money(totals.total_price, totals)}</strong></div>
    {!checkout && <Link href="/checkout" aria-disabled={busy || !!cart.errors.length} tabIndex={busy || cart.errors.length ? -1 : undefined} className={'mt-5 flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-orange-700 ' + (busy || cart.errors.length ? 'pointer-events-none opacity-40' : '')}>ادامه و تسویه‌حساب<ChevronLeft className="size-4" /></Link>}
    <p className="mt-4 flex items-start gap-2 text-xs leading-6 text-gray-400"><ShieldCheck className="mt-1 size-4 shrink-0" />موجودی، تخفیف و مبلغ نهایی هنگام ادامه خرید توسط فروشگاه بررسی می‌شود.</p>
  </section>;
}
