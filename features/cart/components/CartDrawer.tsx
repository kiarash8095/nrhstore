'use client';
import { Dialog } from '@base-ui/react/dialog';
import { X, ShoppingBag, CheckCircle2, CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { useCartUI } from './CartProvider';
import { useCart } from '../hooks/use-cart';
import { CartItems, CartFeedback } from './Cart';
import { cartText, money } from '../utils/cart.utils';

export function CartDrawer() {
  const ui = useCartUI();
  const state = useCart();
  return <Dialog.Root open={ui.open} onOpenChange={open => { if (!open) ui.closeDrawer(); }}>
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <Dialog.Popup data-testid="cart-drawer" dir="rtl" className="fixed inset-y-0 left-0 z-[60] flex h-dvh w-full max-w-md flex-col bg-white shadow-2xl outline-none transition-transform duration-300 data-starting-style:-translate-x-full data-ending-style:-translate-x-full motion-reduce:transition-none">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-5">
          <div className="flex items-center gap-3"><ShoppingBag className="size-6 text-orange-600" /><Dialog.Title className="text-lg font-bold">سبد خرید شما</Dialog.Title></div>
          <Dialog.Close aria-label="بستن سبد خرید" className="rounded-xl bg-gray-100 p-2 hover:bg-gray-200"><X className="size-5" /></Dialog.Close>
        </header>
        <Dialog.Description className="sr-only">مشاهده محصولات، تغییر تعداد و حذف از سبد خرید</Dialog.Description>
        {ui.notice && <div role={ui.notice.tone === 'error' ? 'alert' : 'status'} className={'mx-4 mt-4 flex items-start gap-2 rounded-xl p-3 text-xs leading-7 sm:hidden ' + (ui.notice.tone === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700')}>
          {ui.notice.tone === 'success' ? <CheckCircle2 className="mt-1 size-4 shrink-0" /> : <CircleAlert className="mt-1 size-4 shrink-0" />}
          <p className="flex-1">{cartText(ui.notice.message)}</p><button type="button" onClick={ui.dismissNotice} aria-label="بستن اعلان" className="p-1"><X className="size-4" /></button>
        </div>}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <CartFeedback state={state} />
          {state.cart && <CartItems state={state} compact />}
        </div>
        {!!state.cart?.items.length && <footer className="space-y-4 border-t border-gray-100 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between text-sm"><span className="text-gray-500">مبلغ سبد خرید</span><strong>{money(state.cart.totals.total_price, state.cart.totals)}</strong></div>
          <Link href="/cart" onClick={ui.closeDrawer} className="block rounded-xl bg-orange-600 px-4 py-3.5 text-center text-sm font-bold text-white transition hover:bg-orange-700">مشاهده و تکمیل سبد خرید</Link>
          <button type="button" onClick={ui.closeDrawer} className="w-full text-center text-sm text-gray-500 hover:text-gray-900">ادامه خرید</button>
        </footer>}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
