'use client';

import { useRef } from 'react';
import { LoaderCircle, ShoppingBag } from 'lucide-react';
import { useCart } from '../hooks/use-cart';
import type { AddCartItemInput } from '../contracts';

export function AddToCartButton({ item, disabled, className = '' }: {
  item: AddCartItemInput;
  disabled?: boolean;
  className?: string;
}) {
  const state = useCart();
  const submitting = useRef(false);
  const preparing = !state.isSessionReady;
  const pending = state.busy || preparing;

  async function addItem() {
    if (disabled || pending || submitting.current) return;
    submitting.current = true;
    try {
      await state.addItem(item);
    } catch {
      // useCart displays the server error and reconciles the cart.
    } finally {
      submitting.current = false;
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={() => void addItem()}
      className={'flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3.5 text-sm font-bold text-white transition enabled:hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ' +
        (disabled ? 'cursor-not-allowed opacity-40 ' : pending ? 'cursor-wait ' : '') + className}
    >
      {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <ShoppingBag className="size-5" aria-hidden="true" />}
      <span aria-live="polite">{preparing ? 'در حال آماده‌سازی خرید…' : state.busy ? 'در حال افزودن…' : 'افزودن به سبد خرید'}</span>
    </button>
  );
}

