'use client';
import { useState } from 'react';
import { TicketPercent, X } from 'lucide-react';
import type { WooCommerceCart } from '../contracts';
export function CartCoupon({ cart, busy, apply, remove }: { cart: WooCommerceCart; busy: boolean; apply: (code: string) => Promise<unknown>; remove: (code: string) => Promise<unknown> }) {
  const [code, setCode] = useState('');
  return <div className="space-y-3 rounded-2xl border border-gray-200 p-4">
    <label htmlFor="cart-coupon" className="flex items-center gap-2 text-sm font-bold"><TicketPercent className="size-5 text-orange-600" />کد تخفیف دارید؟</label>
    <form onSubmit={event => { event.preventDefault(); if (code.trim()) void apply(code.trim()).then(() => setCode('')).catch(() => {}); }} className="flex gap-2">
      <input id="cart-coupon" value={code} onChange={event => setCode(event.target.value)} maxLength={100} placeholder="کد تخفیف" className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-orange-500" />
      <button type="submit" disabled={busy || !code.trim()} className="rounded-xl bg-gray-900 px-4 text-sm text-white disabled:opacity-40">اعمال</button>
    </form>
    {cart.coupons.map(coupon => <div key={coupon.code} className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"><span>{coupon.code}</span><button type="button" disabled={busy} onClick={() => void remove(coupon.code).catch(() => {})} aria-label={'حذف کد ' + coupon.code}><X className="size-4" /></button></div>)}
  </div>;
}

