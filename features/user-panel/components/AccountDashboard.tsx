'use client';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpLeft,
  CheckCircle2,
  Heart,
  Headphones,
  MapPin,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  UserRound,
  XCircle,
} from 'lucide-react';
import { statsSchema, orderListSchema, wishlistSchema } from '../contracts';
import { useAccountQuery } from '../hooks/use-user-panel';
import {
  AccountError,
  AccountLoading,
  EmptyState,
  glass,
  SectionTitle,
} from './AccountUI';
import { OrderRows } from './AccountOrders';

export function AccountDashboard({ name }: { name: string }) {
  const stats = useAccountQuery('stats', statsSchema);
  const orders = useAccountQuery('orders?page=1', orderListSchema);
  const favorites = useAccountQuery('wishlist', wishlistSchema);
  const tiles = [
    {
      label: 'سفارش تکمیل‌شده',
      value: stats.data?.completed,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50',
      href: '/account/orders',
    },
    {
      label: 'سفارش لغوشده',
      value: stats.data?.cancelled,
      icon: XCircle,
      color: 'text-rose-500 bg-rose-50',
      href: '/account/orders',
    },
    {
      label: 'سفارش بازپرداخت‌شده',
      value: stats.data?.refunded,
      icon: RotateCcw,
      color: 'text-violet-600 bg-violet-50',
      href: '/account/orders',
    },
    {
      label: 'کالای مورد علاقه',
      value: favorites.data?.ids.length,
      icon: Heart,
      color: 'text-orange-600 bg-orange-50',
      href: '/account/wishlist',
    },
  ];
  return (
    <>
      <SectionTitle
        title={'سلام ' + name + '، خوش آمدید'}
        subtitle="خلاصه حساب شما و دسترسی به همه چیزهایی که برای خرید نیاز دارید."
      />
      <section className="relative mb-5 isolate overflow-hidden rounded-3xl border border-white/90 bg-gradient-to-bl from-[#fff4e8] via-[#fffaf5] to-white/80 p-6 shadow-[0_14px_50px_-32px_#e48743] sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-14 -top-24 size-80 rounded-full bg-orange-200/35 blur-3xl"
        />
        <div className="relative flex min-h-44 items-center justify-between gap-4">
          <div className="max-w-sm">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white/80 px-3 py-1.5 text-[10px] font-bold text-orange-700">
              <Sparkles className="size-3.5" />
              همراه شما در هر خرید
            </span>
            <h2 className="text-xl font-black leading-10 text-gray-900 sm:text-2xl">
              خریدهای شما،
              <br />
              مرتب و همیشه در دسترس
            </h2>
            <p className="mt-3 text-xs leading-7 text-gray-500">
              از پیگیری سفارش تا آماده‌کردن خرید بعدی؛ همه چیز از اینجا شروع
              می‌شود.
            </p>
            <Link
              href="/products"
              className="mt-5 inline-flex min-h-10 items-center gap-2 text-xs font-bold text-orange-700"
            >
              گشت‌وگذار در فروشگاه
              <ArrowLeft className="size-4" />
            </Link>
          </div>
          <div
            aria-hidden="true"
            className="relative hidden h-44 w-56 shrink-0 sm:block"
          >
            <div className="absolute left-7 top-4 flex size-36 rotate-[-10deg] items-center justify-center rounded-[2rem] border border-white bg-white/65 shadow-xl shadow-orange-900/5 backdrop-blur">
              <PackageCheck
                className="size-20 text-orange-500"
                strokeWidth={1.1}
              />
            </div>
            <span className="absolute right-0 top-0 flex items-center gap-2 rounded-2xl border border-white bg-white/80 px-4 py-3 text-[11px] font-bold text-gray-600 shadow-lg shadow-orange-900/5">
              <ShieldCheck className="size-4 text-emerald-500" />
              خرید با خیال راحت
            </span>
            <span className="absolute bottom-0 left-0 flex items-center gap-2 rounded-2xl border border-white bg-white/80 px-4 py-3 text-[11px] font-bold text-gray-600 shadow-lg shadow-orange-900/5">
              <Truck className="size-4 text-orange-500" />
              همراه سفارش شما
            </span>
          </div>
        </div>
      </section>
      <section
        aria-label="خلاصه حساب"
        className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className={
              glass + ' group p-4 transition hover:border-orange-200 sm:p-5'
            }
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <span
                className={
                  'inline-flex size-10 items-center justify-center rounded-2xl ' +
                  tile.color
                }
              >
                <tile.icon className="size-5" />
              </span>
              <ArrowUpLeft className="size-4 text-gray-300 transition group-hover:text-orange-500" />
            </div>
            <strong className="block text-2xl font-black text-gray-900">
              {tile.value === undefined
                ? '—'
                : tile.value.toLocaleString('fa-IR')}
            </strong>
            <span className="mt-2 block text-[11px] leading-6 text-gray-500">
              {tile.label}
            </span>
          </Link>
        ))}
      </section>
      {(stats.error || favorites.error) && (
        <div className="mb-5">
          <AccountError
            error={stats.error || favorites.error!}
            retry={() => {
              void stats.refetch();
              void favorites.refetch();
            }}
          />
        </div>
      )}
      <section className={glass + ' p-5 sm:p-6'}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-gray-800">آخرین سفارش‌ها</h2>
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-1 text-xs font-bold text-orange-700"
          >
            مشاهده همه
            <ArrowLeft className="size-3.5" />
          </Link>
        </div>
        {orders.isPending ? (
          <AccountLoading />
        ) : orders.error ? (
          <AccountError
            error={orders.error}
            retry={() => void orders.refetch()}
          />
        ) : orders.data.orders.length ? (
          <OrderRows orders={orders.data.orders.slice(0, 3)} />
        ) : (
          <EmptyState
            icon={<PackageCheck />}
            title="اولین خریدتان را شروع کنید"
            description="سفارش‌های ثبت‌شده شما و وضعیت تحویل آن‌ها در این بخش قرار می‌گیرند."
          />
        )}
      </section>
      <section
        aria-label="دسترسی سریع"
        className="mt-5 grid gap-3 sm:grid-cols-3"
      >
        {[
          {
            href: '/account/addresses',
            label: 'نشانی‌های تحویل',
            sub: 'مدیریت آدرس‌ها',
            icon: MapPin,
          },
          {
            href: '/account/profile',
            label: 'اطلاعات حساب',
            sub: 'تکمیل و ویرایش پروفایل',
            icon: UserRound,
          },
          {
            href: '/account/support',
            label: 'راهنمایی و پشتیبانی',
            sub: 'راه‌های ارتباط با فروشگاه',
            icon: Headphones,
          },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              glass +
              ' flex items-center gap-3 p-5 transition hover:border-orange-200'
            }
          >
            <link.icon className="size-5 shrink-0 text-orange-500" />
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-gray-800">{link.label}</h3>
              <p className="mt-1.5 text-[10px] leading-5 text-gray-500">
                {link.sub}
              </p>
            </div>
            <ArrowUpLeft className="mr-auto size-4 shrink-0 text-gray-400" />
          </Link>
        ))}
      </section>
    </>
  );
}
