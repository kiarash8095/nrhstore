'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CreditCard, LoaderCircle, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { getAuthIdentity, useAuth, useAuthActions } from '@/features/auth';
import { useCart } from '../hooks/use-cart';
import { useCartUI } from './CartProvider';
import { CartFeedback } from './Cart';
import { CartEmpty } from './CartEmpty';
import { CartSummary } from './CartSummary';
import { CartCoupon } from './CartCoupon';
import { CheckoutProgress } from './CheckoutProgress';
import { CheckoutAddress, CheckoutAddressSummary } from './CheckoutAddress';
import { CheckoutShipping } from './CheckoutShipping';
import { CheckoutPayment } from './CheckoutPayment';
import { CheckoutOrderReview } from './CheckoutOrderReview';
import { CartClientError, payCheckout } from '../api/cart.api';
import { allowedPaymentRedirect, checkoutSnapshot } from '../utils/checkout';
import { cartKeys } from '../api/cart.keys';
import { cartText, money } from '../utils/cart.utils';
import type { WooCommerceCart } from '../contracts';

function addressStamp(cart: WooCommerceCart) {
  return JSON.stringify([cart.billing_address, cart.shipping_address]);
}

export function Checkout({ requestedStep = 'shipping' }: { requestedStep?: 'shipping' | 'payment' }) {
  const state = useCart();
  const ui = useCartUI();
  const client = useQueryClient();
  const router = useRouter();
  const auth = useAuth();
  const { openAuth } = useAuthActions();
  const heading = useRef<HTMLHeadingElement>(null);
  const attempt = useRef<{ identity: string; hash: string; id: string } | null>(null);
  const paymentInFlight = useRef(false);
  const [savedAddress, setSavedAddress] = useState<{ identity: string; stamp: string } | null>(null);
  const prepared = useMutation({
    mutationKey: cartKeys.mutations,
    scope: { id: 'cart-writes' },
    retry: false,
    mutationFn: async ({ identity, cart: snapshot }: { identity: string; cart: WooCommerceCart }) => {
      await client.cancelQueries({ queryKey: cartKeys.session(identity) });
      if (getAuthIdentity() !== identity) throw new Error('نشست تغییر کرده است. سبد را تازه‌سازی کنید.');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(checkoutSnapshot(snapshot)));
      const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      if (attempt.current?.hash !== hash || attempt.current?.identity !== identity) attempt.current = { identity, hash, id: crypto.randomUUID() };
      const payment = await payCheckout({ attempt_id: attempt.current.id, cart_hash: hash, expected_total: snapshot.totals.total_price });
      if (!allowedPaymentRedirect(payment.redirect_url, window.location.origin, payment.order_id)) throw new Error('آدرس پرداخت معتبر نیست. وضعیت سفارش را با پشتیبانی بررسی کنید.');
      return { ...payment, identity };
    },
    onSuccess: result => {
      if (getAuthIdentity() !== result.identity) { paymentInFlight.current = false; return; }
      window.location.assign(result.redirect_url);
    },
    onError: (error, submitted) => {
      paymentInFlight.current = false;
      if (getAuthIdentity() !== submitted.identity) return;
      if (error instanceof CartClientError && error.cart) client.setQueryData(cartKeys.session(submitted.identity), error.cart);
      ui.notify(error.message, 'error');
    },
  });
  const cart = state.cart;
  const addressSaved = !!cart && savedAddress?.identity === state.queryKey[1] && savedAddress.stamp === addressStamp(cart);
  const shippingReady = !!cart && (!cart.needs_shipping || (!!cart.shipping_rates.length && cart.shipping_rates.every(pack => pack.shipping_rates?.some(rate => rate.selected && rate.rate_id))));
  const deliveryReady = addressSaved && shippingReady;
  const paymentStep = requestedStep === 'payment' && deliveryReady;
  const locked = state.busy || prepared.isPending || prepared.isSuccess;
  const gatewayAvailable = !!cart?.needs_payment && cart.payment_methods.includes('melli_pay');
  const issue = !auth.isAuthenticated ? 'برای ادامه خرید وارد حساب شوید.'
    : cart?.account_sync_pending ? 'همگام‌سازی سبد با حساب شما باید تکمیل شود.'
      : state.error ? 'دریافت اطلاعات سبد با مشکل روبه‌رو شد. سبد را تازه‌سازی کنید.'
        : cart?.errors.length ? 'ابتدا خطاهای سبد خرید را برطرف کنید.'
          : !addressSaved ? 'اطلاعات گیرنده و آدرس را ذخیره و تأیید کنید.'
            : !shippingReady ? 'روش ارسال سفارش را انتخاب کنید.'
              : paymentStep && !gatewayAvailable ? 'درگاه پرداخت برای این سفارش در دسترس نیست.' : '';
  const canContinue = !locked && !state.isFetching && !issue;

  useEffect(() => {
    if (cart?.items.length) heading.current?.focus({ preventScroll: true });
  }, [paymentStep, cart?.items.length]);

  const goToShipping = () => {
    if (locked) return;
    prepared.reset();
    router.push('/checkout', { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const continueCheckout = () => {
    if (!canContinue || !cart || paymentInFlight.current) return;
    if (!paymentStep) {
      router.push('/checkout?step=payment', { scroll: false });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    paymentInFlight.current = true;
    prepared.mutate({ identity: state.queryKey[1], cart });
  };
  const buttonLabel = prepared.isSuccess ? 'در حال انتقال به درگاه…' : prepared.isPending ? 'در حال آماده‌سازی پرداخت…' : paymentStep ? 'پرداخت با سداد بانک ملی' : 'ادامه به مرحله پرداخت';
  const action = (mobile = false) => <button type="button" onClick={continueCheckout} disabled={!canContinue} aria-describedby="checkout-action-help"
    className={'flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40 ' + (mobile ? 'min-w-0 flex-1' : 'w-full')}>
    {prepared.isPending || prepared.isSuccess ? <LoaderCircle className="size-4 shrink-0 animate-spin" /> : paymentStep ? <CreditCard className="size-4 shrink-0" /> : null}
    {buttonLabel}{!paymentStep && <ChevronLeft className="size-4 shrink-0" />}
  </button>;

  return <main className="mx-auto w-[92%] max-w-6xl py-6 pb-44 sm:py-10 lg:pb-14">
    <CheckoutProgress step={paymentStep ? 3 : 2} locked={locked} onShipping={goToShipping} />
    {paymentStep ? <button type="button" disabled={locked} onClick={goToShipping} className="mb-5 flex items-center gap-1 text-xs text-gray-500 disabled:opacity-40"><ChevronRight className="size-4" />بازگشت به آدرس و ارسال</button>
      : <Link href="/cart" className="mb-5 flex items-center gap-1 text-xs text-gray-500"><ChevronRight className="size-4" />بازگشت به سبد خرید</Link>}
    <div className="mb-6">
      <h1 ref={heading} tabIndex={-1} className="scroll-mt-32 text-xl font-bold outline-none">{paymentStep ? 'انتخاب پرداخت و تأیید سفارش' : 'تکمیل آدرس و روش ارسال'}</h1>
      <p className="mt-2 text-xs leading-7 text-gray-500">{paymentStep ? 'اطلاعات سفارش و مبلغ نهایی را بررسی کنید؛ سپس به درگاه بانکی بروید.' : 'سفارش شما در سه مرحله تکمیل می‌شود. در این مرحله، گیرنده و نحوه تحویل را مشخص کنید.'}</p>
    </div>
    <CartFeedback state={state} />
    {cart && (cart.items.length ? <>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {!auth.isAuthenticated && <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-orange-200 bg-orange-50/60 p-5">
            <div><h2 className="text-sm font-bold text-gray-800">ورود برای تکمیل خرید</h2><p className="mt-2 text-xs leading-6 text-gray-600">برای ثبت سفارش و پیگیری پرداخت، وارد حساب خود شوید.</p></div>
            <button type="button" disabled={locked} onClick={() => openAuth({ nextPath: '/checkout' })} className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-orange-700 ring-1 ring-orange-200 disabled:opacity-40">برای پرداخت وارد حساب شوید</button>
          </section>}
          {requestedStep === 'payment' && !deliveryReady && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-800">برای ادامه پرداخت، آدرس و روش ارسال فعلی را دوباره تأیید کنید.</p>}
          {paymentStep ? <>
            <CheckoutPayment available={gatewayAvailable} />
            <CartCoupon key={state.queryKey[1]} cart={cart} busy={locked} apply={state.applyCoupon} remove={state.removeCoupon} />
            <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-bold"><MapPin className="size-5 text-orange-600" />{cart.needs_shipping ? 'تحویل سفارش' : 'اطلاعات صورت‌حساب'}</h2><button type="button" disabled={locked} onClick={goToShipping} className="py-2 text-xs font-bold text-cyan-700 disabled:opacity-40">ویرایش</button></div>
              <CheckoutAddressSummary cart={cart} />
              {cart.needs_shipping && <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">{cart.shipping_rates.map((pack, index) => <p key={String(pack.package_id ?? index)} className="flex items-center gap-2 text-xs leading-6 text-gray-600"><Truck className="size-4 shrink-0" />{cartText(pack.name || 'بسته ارسال')}: {pack.shipping_rates?.filter(rate => rate.selected).map(rate => cartText(rate.name)).join('، ')}</p>)}</div>}
            </section>
          </> : <>
            <CheckoutAddress key={state.queryKey[1]} cart={cart} busy={locked} saved={addressSaved}
              onEdit={() => { setSavedAddress(null); prepared.reset(); }}
              onSave={async billing => {
                prepared.reset();
                const identity = state.queryKey[1];
                const { email: _email, ...shipping } = billing;
                void _email;
                const updated = await state.updateCustomer({ billing_address: billing, shipping_address: shipping });
                if (getAuthIdentity() !== identity) return;
                setSavedAddress({ identity, stamp: addressStamp(updated) });
                ui.notify('آدرس ذخیره شد و هزینه ارسال به‌روز شد.', 'success');
              }} />
            <CheckoutShipping cart={cart} addressSaved={addressSaved} busy={locked} onSelect={input => { prepared.reset(); void state.selectShipping(input).catch(() => {}); }} />
          </>}
          <CheckoutOrderReview cart={cart} />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-28">
          <CartSummary cart={cart} checkout shippingConfirmed={deliveryReady} />
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="hidden lg:block">{action()}</div>
            <p id="checkout-action-help" aria-live="polite" className={'text-xs leading-7 lg:mt-3 ' + (issue ? 'text-amber-800' : 'text-gray-500')}>
              {state.busy && !prepared.isPending ? 'در حال به‌روزرسانی اطلاعات و مبلغ سفارش…' : issue || (paymentStep ? 'با انتخاب پرداخت، سفارش برای پرداخت به سداد ارسال می‌شود. تکمیل خرید پس از تأیید بانک است.' : 'در مرحله بعد، کد تخفیف و روش پرداخت را بررسی می‌کنید. هنوز مبلغی پرداخت نمی‌شود.')}
            </p>
            {prepared.error && <p role="alert" className="mt-4 text-sm leading-7 text-red-700">{prepared.error.message}</p>}
          </div>
          <p className="flex items-start gap-2 px-1 text-xs leading-7 text-gray-500"><ShieldCheck className="mt-1 size-4 shrink-0 text-emerald-600" />موجودی و مبلغ سفارش پیش از انتقال به درگاه دوباره بررسی می‌شود.</p>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_#00000008] lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-4"><div className="shrink-0 space-y-1"><span className="block text-[10px] text-gray-500">{deliveryReady ? 'مبلغ قابل پرداخت' : 'مبلغ فعلی سفارش'}</span><strong className="block text-xs sm:text-sm">{money(cart.totals.total_price, cart.totals)}</strong></div>{action(true)}</div>
        {issue && <p className="mx-auto mt-2 max-w-xl text-[11px] leading-5 text-amber-800">{issue}</p>}
      </div>
    </> : <CartEmpty />)}
  </main>;
}
