'use client';
import { RefreshCw } from 'lucide-react';
import { CartFeedback, CartItems, CartSummary, useCart } from '@/features/cart';
import { glass, secondaryClass, SectionTitle } from './AccountUI';

export function AccountCart() {
  const state = useCart();
  return <section aria-label="سبد خرید فعال حساب">
    <SectionTitle title="سبد خرید" subtitle="کالاهای انتخاب‌شده را بررسی کنید و برای ثبت سفارش، تسویه را ادامه دهید." />
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p role="status" className="text-xs text-gray-500">
        {state.cart ? `${state.cart.items_count.toLocaleString('fa-IR')} کالا در سبد خرید` : 'دریافت سبد حساب'}
      </p>
      <button type="button" disabled={state.isFetching || state.busy} onClick={() => void state.refetch()} className={secondaryClass}>
        <RefreshCw className={'size-4 ' + (state.isFetching ? 'animate-spin' : '')} />
        تازه‌سازی سبد
      </button>
    </div>
    <CartFeedback state={state} />
    {state.cart && <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
      <div className={glass + ' min-w-0 px-4 sm:px-5'}><CartItems state={state} compact /></div>
      {!!state.cart.items.length && <aside><CartSummary cart={state.cart} busy={state.busy} /></aside>}
    </div>}
  </section>;
}
