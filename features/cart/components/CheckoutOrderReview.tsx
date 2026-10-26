import Image from 'next/image';
import Link from 'next/link';
import { Package } from 'lucide-react';
import type { WooCommerceCart } from '../contracts';
import { cartItemPath, cartText, money } from '../utils/cart.utils';

export function CheckoutOrderReview({ cart }: { cart: WooCommerceCart }) {
  return <section aria-labelledby="checkout-items-title" className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 id="checkout-items-title" className="flex items-center gap-2 font-bold"><Package className="size-5 text-orange-600" />مرور کالاهای سفارش <span className="text-xs font-normal text-gray-500">({cart.items_count.toLocaleString('fa-IR')} کالا)</span></h2>
      <Link href="/cart" className="shrink-0 py-2 text-xs font-bold text-cyan-700">ویرایش سبد</Link>
    </div>
    <div className="divide-y divide-gray-100">{cart.items.map(item => <article key={item.key} data-testid="cart-item" className="flex gap-4 py-4 last:pb-0">
      <Link href={cartItemPath(item)} className="relative size-16 shrink-0 self-start rounded-xl border border-gray-100 sm:size-20">
        {item.images[0]?.src ? <Image fill sizes="80px" src={item.images[0].src} alt={cartText(item.name)} className="object-contain p-2" /> : <Package className="size-full p-4 text-gray-300" />}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={cartItemPath(item)} className="text-sm font-medium leading-7 text-gray-800">{cartText(item.name)}</Link>
        {!!item.variation?.length && <p className="mt-1 text-xs leading-6 text-gray-500">{item.variation.map(value => cartText(value.attribute) + ': ' + cartText(value.value)).join('، ')}</p>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-gray-500">تعداد: {item.quantity.toLocaleString('fa-IR')}</span><span className="font-medium">{money(item.totals.line_total, item.totals)}</span></div>
      </div>
    </article>)}</div>
  </section>;
}
