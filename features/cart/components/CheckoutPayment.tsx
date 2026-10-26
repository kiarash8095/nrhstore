import Image from 'next/image';
import { CreditCard, LockKeyhole, ShieldCheck } from 'lucide-react';

export function CheckoutPayment({ available }: { available: boolean }) {
  return <section aria-labelledby="checkout-payment-title" className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
    <h2 id="checkout-payment-title" className="mb-5 flex items-center gap-2 font-bold"><CreditCard className="size-5 text-orange-600" />روش پرداخت</h2>
    {available ? <>
      <label className="flex items-start gap-3 rounded-xl border border-orange-400 bg-orange-50/50 p-4 sm:p-5">
        <input type="radio" name="payment-method" value="melli_pay" checked readOnly className="mt-1 size-4 shrink-0 accent-orange-600" />
        <span className="min-w-0 flex-1"><span className="block text-sm font-bold">پرداخت اینترنتی</span><span className="mt-2 block text-xs leading-6 text-gray-600">سداد بانک ملی · با کارت‌های عضو شتاب</span></span>
        <span className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg border border-orange-100 bg-white p-2"><Image src="/payments/bank-melli.svg" alt="بانک ملی ایران" width={96} height={48} className="h-auto max-h-12 w-full object-contain" /></span>
      </label>
      <div className="mt-5 space-y-4 text-xs leading-7 text-gray-600">
        <p className="flex items-start gap-2"><LockKeyhole className="mt-1 size-4 shrink-0 text-gray-400" /><span>با انتخاب «پرداخت با سداد بانک ملی» به درگاه بانکی منتقل می‌شوید. اطلاعات کارت را فقط در صفحه درگاه وارد کنید.</span></p>
        <p className="flex items-start gap-2"><ShieldCheck className="mt-1 size-4 shrink-0 text-gray-400" /><span>نشانی درگاه: <bdi className="font-medium text-gray-800">sadad.shaparak.ir</bdi>. پس از پرداخت، نتیجه و کد پیگیری در همین فروشگاه نمایش داده می‌شود.</span></p>
      </div>
    </> : <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-800">درگاه پرداخت برای این سفارش در دسترس نیست. سبد را تازه‌سازی کنید یا با پشتیبانی تماس بگیرید.</p>}
  </section>;
}
