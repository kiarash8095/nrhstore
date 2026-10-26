import { Truck } from 'lucide-react';
import type { ShippingInput, WooCommerceCart } from '../contracts';
import { cartText, money } from '../utils/cart.utils';

export function CheckoutShipping({ cart, addressSaved, busy, onSelect }: {
  cart: WooCommerceCart;
  addressSaved: boolean;
  busy: boolean;
  onSelect: (input: ShippingInput) => void;
}) {
  if (!cart.needs_shipping) return null;
  return <section aria-labelledby="checkout-shipping-title" className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
    <h2 id="checkout-shipping-title" className="mb-4 flex items-center gap-2 font-bold"><Truck className="size-5 text-orange-600" />روش ارسال</h2>
    {!addressSaved ? <p className="rounded-xl bg-gray-50 p-4 text-sm leading-7 text-gray-500">ابتدا آدرس را ذخیره کنید تا روش‌های ارسال به مقصد شما نمایش داده شود.</p>
      : !cart.shipping_rates.length || cart.shipping_rates.some(pack => !pack.shipping_rates?.length) ? <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-800">برای این آدرس روش ارسال پیدا نشد. آدرس را ویرایش کنید یا با پشتیبانی تماس بگیرید.</p>
        : <div className="space-y-5">{cart.shipping_rates.map((pack, index) => <fieldset key={String(pack.package_id ?? index)} disabled={busy} className="space-y-3">
          <legend className="mb-3 text-xs text-gray-500">{cartText(pack.name || 'بسته ارسال')} · انتخاب روش تحویل</legend>
          {pack.shipping_rates?.map(rate => <label key={rate.rate_id || rate.name} className={'flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm transition-colors ' + (rate.selected ? 'border-orange-400 bg-orange-50/60' : 'border-gray-200 hover:border-gray-300')}>
            <input type="radio" name={'shipping-' + (pack.package_id ?? index)} checked={!!rate.selected} disabled={!rate.rate_id} onChange={() => rate.rate_id && onSelect({ package_id: pack.package_id ?? index, rate_id: rate.rate_id })} className="size-4 shrink-0 accent-orange-600" />
            <span className="min-w-0 flex-1"><span className="block font-medium">{cartText(rate.name || 'ارسال فروشگاه')}</span>{rate.description && <span className="mt-1 block text-xs leading-6 text-gray-500">{cartText(rate.description)}</span>}</span>
            <span className="shrink-0 text-xs font-bold">{rate.price === '0' ? 'رایگان' : money(rate.price, cart.totals)}</span>
          </label>)}
        </fieldset>)}</div>}
    <p className="mt-4 text-xs leading-6 text-gray-500">هزینه ارسال در خلاصه سفارش محاسبه می‌شود.</p>
  </section>;
}
