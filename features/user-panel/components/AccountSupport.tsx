import { ArrowUpLeft, Clock3, Mail, MapPin, Phone } from 'lucide-react';
import { contact } from '../constants/contact';
import { glass, SectionTitle } from './AccountUI';

export function AccountSupport() {
  return (
    <>
      <SectionTitle
        title="پشتیبانی"
        subtitle="برای راهنمایی خرید یا پیگیری سفارش، با نوین رایانه همدان در ارتباط باشید."
      />
      <section className={glass + ' relative overflow-hidden p-6 sm:p-8'}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 size-64 rounded-full bg-orange-200/20 blur-3xl"
        />
        <div className="relative max-w-lg">
          <span className="mb-5 inline-flex rounded-2xl bg-orange-100/70 p-3 text-orange-600">
            <Phone className="size-6" />
          </span>
          <h2 className="text-xl font-black leading-9 text-gray-900">
            کنار شما هستیم؛
            <br />
            از انتخاب محصول تا دریافت سفارش
          </h2>
          <p className="mt-3 text-sm leading-8 text-gray-500">
            برای پیگیری سریع‌تر، شماره سفارش خود را هنگام تماس یا ارسال ایمیل
            همراه داشته باشید.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs leading-7 text-gray-500">
            <Clock3 className="size-4 shrink-0" />
            {contact.hours}
          </p>
        </div>
      </section>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <a
          href={'tel:' + contact.phone}
          className={
            glass +
            ' group flex items-center gap-4 p-6 transition hover:border-orange-200 hover:bg-white/90'
          }
        >
          <span className="rounded-2xl bg-orange-50 p-3 text-orange-600">
            <Phone className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-gray-800">تماس با فروشگاه</h2>
            <p dir="ltr" className="mt-2 text-right text-sm text-gray-500">
              {contact.phoneLabel}
            </p>
          </div>
          <ArrowUpLeft className="size-4 text-gray-400" />
        </a>
        <a
          href={'mailto:' + contact.email}
          className={
            glass +
            ' group flex items-center gap-4 p-6 transition hover:border-orange-200 hover:bg-white/90'
          }
        >
          <span className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
            <Mail className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-gray-800">ایمیل پشتیبانی</h2>
            <p
              dir="ltr"
              className="mt-2 break-all text-right text-sm text-gray-500"
            >
              {contact.email}
            </p>
          </div>
          <ArrowUpLeft className="size-4 text-gray-400" />
        </a>
      </div>
      <address
        className={glass + ' mt-5 flex items-start gap-4 p-6 not-italic'}
      >
        <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
          <MapPin className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-gray-800">آدرس شرکت</h2>
          <p className="mt-2 text-sm leading-8 text-gray-500">
            {contact.address}
          </p>
        </div>
      </address>
    </>
  );
}
