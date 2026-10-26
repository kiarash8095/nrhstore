'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, LoaderCircle, MapPin, Pencil, UserRound } from 'lucide-react';
import { toAsciiDigits } from '@/features/auth/contracts';
import type { CustomerInput, WooCommerceCart } from '../contracts';
import { iranProvinces } from '../constants/iran-provinces';

export function CheckoutAddressSummary({ cart }: { cart: WooCommerceCart }) {
  const address = cart.needs_shipping ? cart.shipping_address : cart.billing_address;
  const province = iranProvinces.find(([code]) => code === address.state)?.[1] || address.state;
  return <div className="space-y-3 text-sm leading-7 text-gray-700">
    <p className="break-words">{[province, address.city, address.address_1, address.address_2].filter(Boolean).join('، ')}</p>
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
      <span className="flex items-center gap-2"><UserRound className="size-4" />{address.first_name} {address.last_name}</span>
      <span>تماس: <bdi>{address.phone || cart.billing_address.phone}</bdi></span>
      <span>کد پستی: <bdi>{address.postcode}</bdi></span>
    </div>
  </div>;
}

const fields = [
  ['first_name', 'نام گیرنده', 'given-name'],
  ['last_name', 'نام خانوادگی گیرنده', 'family-name'],
  ['phone', 'شماره موبایل گیرنده', 'tel'],
  ['email', 'ایمیل برای رسید سفارش', 'email'],
  ['state', 'استان', 'address-level1'],
  ['city', 'شهر', 'address-level2'],
  ['address_1', 'نشانی کامل (خیابان، کوچه و پلاک)', 'address-line1'],
  ['address_2', 'واحد و توضیحات تکمیلی (اختیاری)', 'address-line2'],
  ['postcode', 'کد پستی ۱۰ رقمی', 'postal-code'],
] as const;

export function CheckoutAddress({ cart, busy, saved, onSave, onEdit }: {
  cart: WooCommerceCart;
  busy: boolean;
  saved: boolean;
  onSave: (address: CustomerInput['billing_address']) => Promise<void>;
  onEdit: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(([name]) => [name,
    toAsciiDigits((cart.needs_shipping && name !== 'email' ? cart.shipping_address[name as keyof typeof cart.shipping_address] : '') || cart.billing_address[name] || ''),
  ])));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  return <section aria-labelledby="checkout-address-title" className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 id="checkout-address-title" className="flex items-center gap-2 font-bold"><MapPin className="size-5 text-orange-600" />{cart.needs_shipping ? 'آدرس تحویل سفارش' : 'اطلاعات خریدار و صورت‌حساب'}</h2>
      {saved && <button type="button" disabled={busy} onClick={onEdit} className="flex shrink-0 items-center gap-1.5 rounded-lg py-2 text-xs font-bold text-cyan-700 disabled:opacity-50"><Pencil className="size-3.5" />ویرایش آدرس</button>}
    </div>
    {saved ? <>
      <CheckoutAddressSummary cart={cart} />
      <p role="status" className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4 text-xs text-emerald-700"><CheckCircle2 className="size-4" />اطلاعات آدرس تأیید شد.</p>
    </> : <form onSubmit={async event => {
      event.preventDefault();
      if (busy || savingRef.current) return;
      const form = event.currentTarget;
      for (const input of Array.from(form.elements)) {
        if (input instanceof HTMLInputElement && input.required && !input.value.trim()) {
          input.setCustomValidity('این قسمت را کامل کنید.'); input.reportValidity(); return;
        }
      }
      savingRef.current = true; setSaving(true); setError('');
      try {
        const address = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, toAsciiDigits(value).trim()]));
        await onSave({ ...address, country: 'IR' });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'ذخیره آدرس ممکن نشد. دوباره تلاش کنید.');
      } finally { savingRef.current = false; setSaving(false); }
    }}>
      <p className="mb-5 text-xs leading-7 text-gray-500">اطلاعات گیرنده را کامل کنید. {cart.needs_shipping ? 'روش و هزینه ارسال پس از ذخیره آدرس مشخص می‌شود.' : 'این اطلاعات برای ثبت سفارش و صدور رسید استفاده می‌شود.'}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([name, label, autoComplete]) => <label key={name} className={'space-y-2 text-sm ' + (name === 'address_1' ? 'sm:col-span-2' : '')}>
          <span className="block text-gray-700">{label}{name !== 'address_2' && <span aria-hidden="true" className="mr-1 text-orange-600">*</span>}</span>
          {name === 'state' ? <select name={name} autoComplete={autoComplete} required disabled={saving || busy} value={values.state} onChange={event => { setValues(current => ({ ...current, state: event.target.value })); setError(''); onEdit(); }} className="block min-h-12 w-full rounded-xl border border-gray-200 bg-white px-3 outline-orange-500 disabled:bg-gray-50">
            <option value="">انتخاب استان</option>
            {iranProvinces.map(([code, province]) => <option key={code} value={code}>{province}</option>)}
          </select> : <input name={name} autoComplete={autoComplete} required={name !== 'address_2'} disabled={saving || busy}
            value={values[name]} type={name === 'email' ? 'email' : name === 'phone' ? 'tel' : 'text'}
            dir={name === 'phone' || name === 'email' || name === 'postcode' ? 'ltr' : undefined}
            inputMode={name === 'postcode' ? 'numeric' : undefined}
            maxLength={name === 'postcode' ? 10 : name === 'phone' ? 14 : 300}
            pattern={name === 'postcode' ? '[0-9]{10}' : name === 'phone' ? '(0|\\+98|0098)9[0-9]{9}' : undefined}
            onInvalid={event => event.currentTarget.setCustomValidity(name === 'postcode' ? 'کد پستی باید ۱۰ رقم باشد.' : name === 'phone' ? 'شماره موبایل معتبر مانند 09123456789 وارد کنید.' : label + ' را کامل و درست وارد کنید.')}
            onChange={event => {
              event.currentTarget.setCustomValidity('');
              const value = name === 'phone' || name === 'postcode' ? toAsciiDigits(event.target.value) : event.target.value;
              setValues(current => ({ ...current, [name]: value })); setError(''); onEdit();
            }}
            className="block min-h-12 w-full rounded-xl border border-gray-200 px-3 outline-orange-500 disabled:bg-gray-50" />}
        </label>)}
      </div>
      {error && <p role="alert" className="mt-4 text-sm leading-7 text-red-700">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
        <p className="text-xs text-gray-500">فیلدهای ستاره‌دار الزامی هستند.</p>
        <button type="submit" disabled={busy || saving} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-bold text-white disabled:opacity-40 sm:w-auto">
          {saving && <LoaderCircle className="size-4 animate-spin" />}ذخیره آدرس و محاسبه ارسال
        </button>
      </div>
    </form>}
  </section>;
}
