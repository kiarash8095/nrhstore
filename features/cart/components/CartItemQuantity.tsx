'use client';
import { LoaderCircle, Minus, Plus } from 'lucide-react';
import type { WooCommerceCartItem } from '../contracts';
import { quantityStep } from '../utils/cart.utils';
export function CartItemQuantity({ item, busy, onChange }: { item: WooCommerceCartItem; busy: boolean; onChange: (quantity: number) => void }) {
  const decrease = quantityStep(item, -1), increase = quantityStep(item, 1);
  return <div className="inline-flex h-10 items-center rounded-xl border border-gray-200 bg-white">
    <button type="button" aria-label={'افزایش تعداد ' + item.name} disabled={busy || increase === null} onClick={() => increase !== null && onChange(increase)} className="p-2.5 text-orange-600 disabled:opacity-30"><Plus className="size-4" /></button>
    <span className="min-w-8 text-center text-sm font-bold tabular-nums" aria-live="polite">{busy ? <LoaderCircle className="mx-auto size-4 animate-spin" /> : item.quantity.toLocaleString('fa-IR')}</span>
    <button type="button" aria-label={'کاهش تعداد ' + item.name} disabled={busy || decrease === null} onClick={() => decrease !== null && onChange(decrease)} className="p-2.5 text-orange-600 disabled:opacity-30"><Minus className="size-4" /></button>
  </div>;
}

