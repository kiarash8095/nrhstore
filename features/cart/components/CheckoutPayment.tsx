import Image from 'next/image';
import { Building2, CreditCard, LockKeyhole } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { CheckoutPaymentMethod, WooCommerceCart } from '../contracts';

export function CheckoutPayment({ cart, value, disabled, onChange }: {
  cart: WooCommerceCart; value: CheckoutPaymentMethod | null; disabled: boolean; onChange: (method: CheckoutPaymentMethod) => void;
}) {
  const descriptions = {
    melli_pay: 'پرداخت اینترنتی از طریق سداد، با کارت‌های عضو شتاب',
    bacs: 'پس از ثبت سفارش، اطلاعات حساب و دستور واریز نمایش داده می‌شود. سفارش پس از بررسی واریز توسط فروشگاه پیگیری خواهد شد.',
  };
  return <section aria-labelledby="checkout-payment-title" className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
    <h2 id="checkout-payment-title" className="mb-5 flex items-center gap-2 font-bold"><CreditCard className="size-5 text-orange-600" />روش پرداخت</h2>
    <RadioGroup name="payment_method" value={value ?? ''} onValueChange={method => { if (method === 'melli_pay' || method === 'bacs') onChange(method); }} disabled={disabled} aria-labelledby="checkout-payment-title">
      {(['melli_pay', 'bacs'] as const).map(method => {
        const available = cart.needs_payment && cart.payment_methods.includes(method);
        const details = cart.nrh_checkout?.methods.find(item => item.id === method);
        return <Label key={method} htmlFor={'payment-' + method} className={'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors sm:p-5 ' + (value === method ? 'border-orange-400 bg-orange-50/50' : 'border-gray-200 hover:border-orange-200') + (!available ? ' cursor-not-allowed opacity-50' : '')}>
          <RadioGroupItem id={'payment-' + method} value={method} disabled={!available} className="mt-1" />
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{method === 'melli_pay' ? 'بانک ملی' : 'انتقال مستقیم بانکی'}</span><span className="mt-2 block text-xs font-normal leading-7 text-gray-600">{available ? details?.description || descriptions[method] : 'این روش برای سفارش فعلی در دسترس نیست.'}</span></span>
          {method === 'melli_pay' ? <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg border border-orange-100 bg-white p-2"><Image src="/payments/bank-melli.svg" alt="بانک ملی ایران" width={96} height={48} className="h-auto max-h-10 w-full object-contain" /></span> : <Building2 className="mt-1 size-6 shrink-0 text-gray-400" />}
        </Label>;
      })}
    </RadioGroup>
    <p className="mt-4 flex items-start gap-2 text-xs leading-7 text-gray-500"><LockKeyhole className="mt-1 size-4 shrink-0" /><span>{value === 'bacs' ? 'با «ثبت سفارش» وجهی از حساب شما برداشت نمی‌شود. وضعیت سفارش تا تأیید واریز، در انتظار بررسی می‌ماند.' : 'اطلاعات کارت را فقط در درگاه sadad.shaparak.ir وارد کنید. نتیجه پرداخت در همین فروشگاه نمایش داده می‌شود.'}</span></p>
  </section>;
}
