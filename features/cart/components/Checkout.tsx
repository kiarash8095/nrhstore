"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  LoaderCircle,
  MapPin,
  Truck,
} from "lucide-react";
import { toAsciiDigits } from "@/features/auth/contracts";
import { useCart } from "../hooks/use-cart";
import { useCartUI } from "./CartProvider";
import { CartFeedback, CartItems } from "./Cart";
import { CartEmpty } from "./CartEmpty";
import { CartSummary } from "./CartSummary";
import { CartClientError, payCheckout } from "../api/cart.api";
import { allowedPaymentRedirect, checkoutSnapshot } from '../utils/checkout';
import { cartKeys } from "../api/cart.keys";
import { cartText, money } from "../utils/cart.utils";
import type { WooCommerceCart, CustomerInput } from "../contracts";
import { iranProvinces } from "../constants/iran-provinces";
import { getAuthIdentity, useAuth, useAuthActions } from '@/features/auth';

function addressStamp(cart: WooCommerceCart) {
  return JSON.stringify([cart.billing_address, cart.shipping_address]);
}

function AddressForm({
  cart,
  busy,
  onSave,
  onEdit,
}: {
  cart: WooCommerceCart;
  busy: boolean;
  onSave: (form: HTMLFormElement) => Promise<void>;
  onEdit: () => void;
}) {
  const fields = [
    ["first_name", "نام", "given-name", true],
    ["last_name", "نام خانوادگی", "family-name", true],
    ["phone", "شماره تماس", "tel", true],
    ["email", "ایمیل", "email", true],
    ["state", "استان", "address-level1", true],
    ["city", "شهر", "address-level2", true],
    ["address_1", "آدرس کامل", "street-address", true],
    ["postcode", "کد پستی", "postal-code", true],
  ] as const;
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map(([name]) => [
        name,
        cart.billing_address[name] ||
          cart.shipping_address[name as keyof typeof cart.shipping_address] ||
          "",
      ]),
    ),
  );
  const [saving, setSaving] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (saving || busy) return;
        setSaving(true);
        void onSave(event.currentTarget).finally(() => setSaving(false));
      }}
      className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6"
    >
      <h2 className="mb-5 flex items-center gap-2 font-bold">
        <MapPin className="size-5 text-orange-600" />
        اطلاعات گیرنده و آدرس
      </h2>
      <p className="mb-5 text-xs leading-6 text-gray-500">
        آدرس ارسال و صورت‌حساب یکسان است. هزینه ارسال پس از ذخیره آدرس از
        فروشگاه دریافت می‌شود.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([name, label, autoComplete, required]) => (
          <label
            key={name}
            className={
              "space-y-2 text-sm " +
              (name === "address_1" ? "sm:col-span-2" : "")
            }
          >
            <span>
              {label}
              <span aria-hidden="true" className="mr-1 text-orange-600">
                *
              </span>
            </span>
            {name === "state" ? (
              <select
                name="state"
                autoComplete={autoComplete}
                required
                value={values.state}
                onChange={(event) => {
                  setValues((current) => ({
                    ...current,
                    state: event.target.value,
                  }));
                  onEdit();
                }}
                className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-3 outline-orange-500"
              >
                <option value="">انتخاب استان</option>
                {iranProvinces.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={name}
                autoComplete={autoComplete}
                value={values[name]}
                onInvalid={(event) =>
                  event.currentTarget.setCustomValidity(
                    label + " را کامل و درست وارد کنید.",
                  )
                }
                onChange={(event) => {
                  event.currentTarget.setCustomValidity("");
                  setValues((current) => ({
                    ...current,
                    [name]: event.target.value,
                  }));
                  onEdit();
                }}
                required={required}
                maxLength={name === "postcode" ? 10 : 300}
                type={
                  name === "email" ? "email" : name === "phone" ? "tel" : "text"
                }
                inputMode={name === "postcode" ? "numeric" : undefined}
                pattern={name === "postcode" ? "[0-9۰-۹٠-٩]{10}" : undefined}
                className="block w-full rounded-xl border border-gray-200 px-3 py-3 outline-orange-500"
              />
            )}
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={busy || saving}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-40 sm:w-auto"
      >
        {saving && <LoaderCircle className="size-4 animate-spin" />}ذخیره آدرس و
        محاسبه ارسال
      </button>
    </form>
  );
}
export function Checkout() {
  const state = useCart();
  const ui = useCartUI();
  const client = useQueryClient();
  const auth = useAuth();
  const { openAuth } = useAuthActions();
  const attempt = useRef<{ identity: string; hash: string; id: string } | null>(null);
  const paymentInFlight = useRef(false);
  const [savedAddress, setSavedAddress] = useState<{ identity: string; stamp: string } | null>(null);
  const addressRevision = useRef(0);
  const prepared = useMutation({
    mutationKey: cartKeys.mutations,
    scope: { id: "cart-writes" },
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
    onSuccess: (result) => {
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
  return (
    <main className="mx-auto w-[92%] max-w-6xl py-8 pb-28 sm:py-12">
      <Link
        href="/cart"
        className="mb-6 flex items-center gap-1 text-sm text-gray-500"
      >
        <ChevronRight className="size-4" />
        بازگشت به سبد خرید
      </Link>
      <h1 className="mb-6 text-xl font-bold">تسویه‌حساب</h1>
      <CartFeedback state={state} />
      {cart &&
        (cart.items.length ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <AddressForm
                key={state.queryKey[1]}
                cart={cart}
                busy={state.busy}
                onEdit={() => {
                  addressRevision.current += 1;
                  setSavedAddress(null);
                  prepared.reset();
                }}
                onSave={async (form) => {
                  const submittedRevision = addressRevision.current;
                  const values = Object.fromEntries(new FormData(form));
                  const address = Object.fromEntries(
                    Object.entries(values).map(([key, value]) => [
                      key,
                      toAsciiDigits(String(value)).trim(),
                    ]),
                  ) as CustomerInput["billing_address"];
                  try {
                    prepared.reset();
                    const billing = { ...address, country: "IR" };
                    const { email: _email, ...shipping } = billing;
                    void _email;
                    const updated = await state.updateCustomer({
                      billing_address: billing,
                      shipping_address: shipping,
                    });
                    setSavedAddress(submittedRevision === addressRevision.current ? { identity: state.queryKey[1], stamp: addressStamp(updated) } : null);
                    ui.notify(
                      "آدرس ذخیره شد و هزینه ارسال به‌روز شد.",
                      "success",
                    );
                  } catch {
                    setSavedAddress(null);
                  }
                }}
              />
              {cart.needs_shipping && (
                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h2 className="mb-4 flex items-center gap-2 font-bold">
                    <Truck className="size-5 text-orange-600" />
                    روش ارسال
                  </h2>
                  {!cart.shipping_rates.length && (
                    <p className="text-sm leading-7 text-gray-500">
                      {addressSaved
                        ? "روش ارسالی برای این آدرس پیدا نشد. آدرس را بررسی کنید."
                        : "برای دریافت روش‌های ارسال، آدرس را ذخیره کنید."}
                    </p>
                  )}
                  {cart.shipping_rates.map((pack, index) => (
                    <fieldset
                      key={String(pack.package_id ?? index)}
                      className="space-y-3"
                    >
                      <legend className="mb-3 text-xs text-gray-500">
                        {cartText(pack.name || "بسته ارسال")}
                      </legend>
                      {pack.shipping_rates?.map((rate) => (
                        <label
                          key={rate.rate_id}
                          className={
                            "flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm " +
                            (rate.selected
                              ? "border-orange-400 bg-orange-50"
                              : "border-gray-200")
                          }
                        >
                          <input
                            type="radio"
                            name={"shipping-" + (pack.package_id ?? index)}
                            checked={!!rate.selected}
                            disabled={state.busy}
                            onChange={() => {
                              if (rate.rate_id) {
                                prepared.reset();
                                void state
                                  .selectShipping({
                                    package_id: pack.package_id ?? index,
                                    rate_id: rate.rate_id,
                                  })
                                  .catch(() => {});
                              }
                            }}
                          />
                          <span className="flex-1">
                            {cartText(rate.name || "")}
                          </span>
                          <span>{money(rate.price, cart.totals)}</span>
                        </label>
                      ))}
                    </fieldset>
                  ))}
                </section>
              )}
              <section className="rounded-2xl border border-gray-200 bg-white px-5">
                <h2 className="pt-5 font-bold">مرور کالاهای سفارش</h2>
                <CartItems state={state} compact />
              </section>
            </div>
            <aside className="space-y-4 lg:sticky lg:top-28">
              <CartSummary cart={cart} checkout />
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                {!auth.isAuthenticated && <button type="button" onClick={() => openAuth({ nextPath: '/checkout' })} className="mb-4 w-full rounded-xl border border-orange-300 px-4 py-3 text-sm text-orange-700">برای پرداخت وارد حساب شوید</button>}
                <button
                  type="button"
                  onClick={() => {
                    if (!paymentInFlight.current) {
                      paymentInFlight.current = true;
                      prepared.mutate({ identity: state.queryKey[1], cart });
                    }
                  }}
                  disabled={
                    state.busy ||
                    prepared.isSuccess ||
                    !auth.isAuthenticated ||
                    !addressSaved ||
                    !!cart.errors.length ||
                    !!cart.account_sync_pending ||
                    (cart.needs_shipping &&
                      (!cart.shipping_rates.length ||
                        cart.shipping_rates.some(
                          (pack) =>
                            !pack.shipping_rates?.some((rate) => rate.selected),
                        )))
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-40"
                >
                  {prepared.isPending && (
                    <LoaderCircle className="size-4 animate-spin" />
                  )}
                  {prepared.isSuccess ? 'در حال انتقال…' : 'پرداخت با سداد بانک ملی'}
                </button>
                <p className="mt-3 text-xs leading-6 text-gray-500">
                  پس از تأیید اطلاعات، مستقیماً به صفحه امن پرداخت سداد منتقل می‌شوید.
                </p>
                {prepared.error && (
                  <p
                    role="alert"
                    className="mt-4 text-sm leading-7 text-red-600"
                  >
                    {prepared.error.message}
                  </p>
                )}
              </div>
            </aside>
          </div>
        ) : (
          <CartEmpty />
        ))}
    </main>
  );
}
