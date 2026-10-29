'use client';
import Link from 'next/link';
import { ArrowLeft, LoaderCircle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

export const glass =
  'rounded-3xl border border-white/90 bg-white/75 shadow-[0_8px_32px_-20px_rgba(28,35,52,0.24),inset_0_1px_0_white] backdrop-blur-xl';
export const fieldClass =
  'min-h-12 w-full rounded-2xl border border-gray-200/80 bg-white/80 px-4 text-sm text-gray-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100/70 disabled:bg-gray-50 disabled:opacity-60';
export const primaryClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-sm font-bold text-white shadow-lg shadow-orange-500/15 transition hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-45';
export const secondaryClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-gray-200/80 bg-white/70 px-4 text-xs font-bold text-gray-600 transition hover:border-orange-200 hover:text-orange-700 disabled:opacity-45';

export function AccountLoading() {
  return (
    <div
      role="status"
      className={
        glass +
        ' flex min-h-52 items-center justify-center gap-3 p-8 text-sm text-gray-500'
      }
    >
      <LoaderCircle className="size-5 animate-spin text-orange-500" />
      در حال دریافت اطلاعات…
    </div>
  );
}
export function AccountError({
  error,
  retry,
}: {
  error: Error;
  retry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-100 bg-red-50/80 p-5 text-sm leading-7 text-red-700"
    >
      <p>{error.message}</p>
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="mt-3 flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw className="size-4" />
          تلاش دوباره
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
      <span className="mb-5 flex size-20 items-center justify-center rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white text-orange-500 [&>svg]:size-9">
        {icon}
      </span>
      <h3 className="text-base font-bold text-gray-800">{title}</h3>
      <p className="mt-2 max-w-sm text-xs leading-7 text-gray-500">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1
          tabIndex={-1}
          data-account-heading
          className="text-xl font-black text-gray-900 outline-none sm:text-2xl"
        >
          {title}
        </h1>
        <p className="mt-2 text-xs leading-7 text-gray-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
export function Pagination({
  page,
  pages,
  base,
}: {
  page: number;
  pages: number;
  base: string;
}) {
  if (pages <= 1 && page <= 1) return null;
  if (page > Math.max(1, pages))
    return (
      <nav aria-label="صفحه‌بندی" className="mt-5">
        <Link href={base} className={secondaryClass}>
          بازگشت به صفحه اول
        </Link>
      </nav>
    );
  return (
    <nav
      aria-label="صفحه‌بندی"
      className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-5"
    >
      {page > 1 ? (
        <Link href={base + '?page=' + (page - 1)} className={secondaryClass}>
          صفحه قبل
        </Link>
      ) : (
        <span />
      )}
      <span className="text-xs text-gray-500">
        صفحه {page.toLocaleString('fa-IR')} از {pages.toLocaleString('fa-IR')}
      </span>
      {page < pages ? (
        <Link href={base + '?page=' + (page + 1)} className={secondaryClass}>
          صفحه بعد
          <ArrowLeft className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
export function accountMoney(value: string, currency: string, minor = 0) {
  const amount = Number(value) / 10 ** minor;
  return (
    new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(
      amount,
    ) +
    (currency === 'IRT'
      ? ' تومان'
      : currency === 'IRR'
        ? ' ریال'
        : currency
          ? ' ' + currency
          : '')
  );
}
export function accountDate(value: string) {
  if (!value) return 'ثبت نشده';
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
}
export const orderStatuses: Record<string, { label: string; color: string }> = {
  pending: { label: 'در انتظار پرداخت', color: 'bg-amber-50 text-amber-800' },
  processing: { label: 'در حال پردازش', color: 'bg-blue-50 text-blue-700' },
  'processing-order': {
    label: 'در حال پردازش',
    color: 'bg-blue-50 text-blue-700',
  },
  preparing: { label: 'آماده‌سازی سفارش', color: 'bg-blue-50 text-blue-700' },
  shipped: { label: 'ارسال شده', color: 'bg-cyan-50 text-cyan-700' },
  delivered: {
    label: 'تحویل داده شده',
    color: 'bg-emerald-50 text-emerald-700',
  },
  completed: { label: 'تکمیل شده', color: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'لغو شده', color: 'bg-rose-50 text-rose-700' },
  refunded: { label: 'بازپرداخت شده', color: 'bg-violet-50 text-violet-700' },
  failed: { label: 'پرداخت ناموفق', color: 'bg-red-50 text-red-700' },
  'on-hold': { label: 'در انتظار بررسی', color: 'bg-amber-50 text-amber-800' },
  'shetab-approval': {
    label: 'تأیید پرداخت',
    color: 'bg-emerald-50 text-emerald-700',
  },
  'checkout-draft': {
    label: 'پیش‌نویس خرید',
    color: 'bg-gray-100 text-gray-600',
  },
};
export function OrderBadge({ status }: { status: string }) {
  const data = orderStatuses[status] || {
    label: 'در حال بررسی',
    color: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ' +
        data.color
      }
    >
      <span className="size-1.5 rounded-full bg-current" />
      {data.label}
    </span>
  );
}
