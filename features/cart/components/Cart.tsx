'use client';
import { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { AlertCircle, LoaderCircle, RefreshCw, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../hooks/use-cart';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { CartEmpty } from './CartEmpty';
import { CartCoupon } from './CartCoupon';
import { CartRecommendations } from './CartRecommendations';
import { cartText } from '../utils/cart.utils';
import { CheckoutProgress } from './CheckoutProgress';
type State = ReturnType<typeof useCart>;
export function CartFeedback({ state }: { state: State }) {
  if (state.isLoading && !state.error) return <div role="status" className="flex justify-center gap-3 py-16 text-sm text-gray-500"><LoaderCircle className="size-5 animate-spin" />در حال دریافت سبد خرید…</div>;
  return <>
    {state.error && <div role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm leading-7 text-red-700"><p>{state.error.message}</p><button type="button" onClick={() => void state.refetch()} className="mt-2 flex items-center gap-2 font-bold"><RefreshCw className="size-4" />تازه‌سازی سبد</button></div>}
    {state.cart?.account_sync_pending && <div role="status" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-800">سبد این دستگاه حفظ شده است. همگام‌سازی آن با سبد حساب هنوز تکمیل نشده؛ ادامه تسویه پس از همگام‌سازی ممکن می‌شود.</div>}
    {state.cart?.errors.map((error, index) => <p role="alert" key={index} className="mb-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm leading-7 text-red-700"><AlertCircle className="mt-1 size-4 shrink-0" />{cartText(error.message)}</p>)}
  </>;
}
export function CartItems({ state, compact = false }: { state: State; compact?: boolean }) {
  if (!state.cart?.items.length) return !state.isLoading && !state.error ? <CartEmpty /> : null;
  return <div aria-busy={state.busy}>{state.cart.items.map(item => <CartItem key={item.key} item={item} compact={compact} busy={state.busy}
    onUpdate={quantity => void state.updateItem(item.key, quantity).catch(() => {})}
    onRemove={() => void state.removeItem(item.key).catch(() => {})} />)}</div>;
}
export function Cart() {
  const state = useCart();
  const [confirmClear, setConfirmClear] = useState(false);
  return <main className="mx-auto w-[92%] max-w-6xl py-8 pb-28 sm:py-12">
    <CheckoutProgress step={1} />
    <div className="mb-6 flex items-center justify-between"><h1 className="flex items-center gap-3 text-xl font-bold"><ShoppingBag className="size-6 text-orange-600" />سبد خرید شما</h1>
      {!!state.cart?.items.length && <button type="button" disabled={state.busy} onClick={() => setConfirmClear(true)} className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-600 disabled:opacity-40"><Trash2 className="size-4" />خالی کردن سبد</button>}</div>
    <Dialog.Root open={confirmClear} onOpenChange={setConfirmClear}><Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
      <Dialog.Popup dir="rtl" className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl outline-none">
        <Dialog.Title className="font-bold">سبد خرید خالی شود؟</Dialog.Title>
        <Dialog.Description className="mt-3 text-sm leading-7 text-gray-500">همه کالاها از سبد خرید حذف می‌شوند. می‌توانید دوباره آن‌ها را اضافه کنید.</Dialog.Description>
        <div className="mt-6 flex gap-3"><Dialog.Close className="flex-1 rounded-xl border border-gray-200 py-3 text-sm">انصراف</Dialog.Close><button type="button" disabled={state.busy} onClick={() => void state.clear().then(() => setConfirmClear(false)).catch(() => {})} className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white disabled:opacity-40">حذف همه کالاها</button></div>
      </Dialog.Popup>
    </Dialog.Portal></Dialog.Root>
    <CartFeedback state={state} />
    {state.cart && (state.cart.items.length ? <>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border border-gray-200 bg-white px-4 sm:px-6 lg:col-start-1 lg:row-start-1"><CartItems state={state} /></section>
        <aside className="space-y-4 lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1 lg:row-span-2"><CartSummary cart={state.cart} busy={state.busy} /><CartCoupon cart={state.cart} busy={state.busy} apply={state.applyCoupon} remove={state.removeCoupon} /></aside>
        <div className="lg:col-start-1 lg:row-start-2"><CartRecommendations cart={state.cart} /></div>
      </div>
    </> : <div className="rounded-2xl border border-gray-200 bg-white"><CartEmpty /></div>)}
  </main>;
}
