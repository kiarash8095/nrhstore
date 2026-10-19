'use client';
import { LoaderCircle, ShoppingBag } from 'lucide-react';
import { useCart } from '../hooks/use-cart';
import type { AddCartItemInput } from '../contracts';
export function AddToCartButton({ item, disabled, className = '' }: { item: AddCartItemInput; disabled?: boolean; className?: string }) {
  const state = useCart();
  return <button type="button" disabled={disabled || state.busy || state.isLoading} onClick={() => void state.addItem(item).catch(() => {})} className={'flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40 ' + className}>
    {state.busy ? <LoaderCircle className="size-5 animate-spin" /> : <ShoppingBag className="size-5" />}افزودن به سبد خرید
  </button>;
}

