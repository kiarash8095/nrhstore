'use client';
import { useId, useRef, useState } from 'react';
import { CheckCircle2, LoaderCircle, TicketPercent, X } from 'lucide-react';
import type { WooCommerceCart } from '../contracts';
export function CartCoupon({ cart, busy, apply, remove }: { cart: WooCommerceCart; busy: boolean; apply: (code: string) => Promise<unknown>; remove: (code: string) => Promise<unknown> }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const id = useId();
  const update = async (action: () => Promise<unknown>) => {
    if (busy || inFlight.current) return;
    inFlight.current = true; setPending(true); setError('');
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'بررسی کد تخفیف ممکن نشد.'); }
    finally { inFlight.current = false; setPending(false); }
  };
  return <section aria-label="کد تخفیف" className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
    <label htmlFor={id} className="flex items-center gap-2 text-sm font-bold"><TicketPercent className="size-5 text-orange-600" />کد تخفیف دارید؟</label>
    <p id={id + '-help'} className="text-xs leading-6 text-gray-500">کد را وارد و اعمال کنید تا مبلغ سفارش به‌روز شود.</p>
    <form onSubmit={event => { event.preventDefault(); if (code.trim()) void update(async () => { await apply(code.trim()); setCode(''); }); }} className="flex gap-2">
      <input id={id} value={code} disabled={busy || pending} onChange={event => { setCode(event.target.value); setError(''); }} maxLength={100} placeholder="کد تخفیف" aria-invalid={!!error} aria-describedby={id + (error ? '-error' : '-help')} className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-orange-500 disabled:bg-gray-50" />
      <button type="submit" disabled={busy || pending || !code.trim()} className="flex min-w-16 items-center justify-center rounded-xl bg-gray-900 px-4 text-sm text-white disabled:opacity-40">{pending ? <LoaderCircle aria-label="در حال بررسی" className="size-4 animate-spin" /> : 'اعمال'}</button>
    </form>
    {error && <p id={id + '-error'} role="alert" className="text-xs leading-7 text-red-700">{error}</p>}
    {cart.coupons.map(coupon => <div key={coupon.code} role="status" className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"><span className="flex min-w-0 items-center gap-2"><CheckCircle2 className="size-4 shrink-0" /><bdi className="break-all">{coupon.code}</bdi></span><button type="button" disabled={busy || pending} onClick={() => void update(() => remove(coupon.code))} aria-label={'حذف کد ' + coupon.code} className="rounded-lg p-2 disabled:opacity-40"><X className="size-4" /></button></div>)}
  </section>;
}

