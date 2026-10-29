'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Package,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react';
import { toAsciiDigits } from '@/features/auth/contracts';
import { useAccountQuery } from '../hooks/use-user-panel';
import {
  orderListSchema,
  orderDetailSchema,
  type AccountOrder,
} from '../contracts';
import {
  AccountError,
  AccountLoading,
  EmptyState,
  glass,
  fieldClass,
  OrderBadge,
  Pagination,
  SectionTitle,
  accountDate,
  accountMoney,
  secondaryClass,
  orderStatuses,
} from './AccountUI';

export function OrderRows({ orders }: { orders: AccountOrder[] }) {
  return (
    <div className="divide-y divide-gray-100/80">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={'/account/orders/' + order.id}
          className="group flex flex-wrap items-center justify-between gap-4 py-5 first:pt-2 last:pb-1"
          aria-label={'جزئیات سفارش ' + order.number}
        >
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50/70 text-orange-600">
              <Package className="size-5" />
            </span>
            <div>
              <span className="text-sm font-bold text-gray-800">
                سفارش <bdi>#{order.number}</bdi>
              </span>
              <span className="mt-1.5 block text-[11px] text-gray-500">
                {accountDate(order.date)}
              </span>
            </div>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3 sm:gap-5">
            <OrderBadge status={order.status} />
            <span className="text-xs font-bold text-gray-700">
              {accountMoney(order.total, order.currency)}
            </span>
            <ArrowLeft className="size-4 text-gray-400 transition-transform group-hover:-translate-x-1" />
          </div>
        </Link>
      ))}
    </div>
  );
}
export function AccountOrders({ page }: { page: number }) {
  const orders = useAccountQuery('orders?page=' + page, orderListSchema);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const filtered =
    orders.data?.orders.filter(
      (order) =>
        (!search.trim() ||
          toAsciiDigits(order.number).includes(toAsciiDigits(search).trim())) &&
        (status === 'all' || order.status === status),
    ) || [];
  return (
    <>
      <SectionTitle
        title="سفارش‌های من"
        subtitle="وضعیت خریدها، جزئیات سفارش و اطلاعات تحویل را اینجا دنبال کنید."
        action={
          <button
            type="button"
            disabled={orders.isFetching}
            onClick={() => void orders.refetch()}
            className={secondaryClass}
          >
            <RefreshCw
              className={'size-4 ' + (orders.isFetching ? 'animate-spin' : '')}
            />
            به‌روزرسانی سفارش‌ها
          </button>
        }
      />
      {orders.isPending ? (
        <AccountLoading />
      ) : orders.error ? (
        <AccountError
          error={orders.error}
          retry={() => void orders.refetch()}
        />
      ) : (
        <section className={glass + ' p-5 sm:p-6'}>
          {!!orders.data?.orders.length && (
            <div className="mb-5 border-b border-gray-100 pb-5">
              <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
                <label className="relative">
                  <Search className="absolute right-4 top-4 size-4 text-gray-400" />
                  <input
                    aria-label="جست‌وجوی شماره سفارش"
                    placeholder="شماره سفارش را جست‌وجو کنید"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className={fieldClass + ' pr-11'}
                  />
                </label>
                <select
                  aria-label="فیلتر وضعیت سفارش"
                  className={fieldClass}
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="all">همه وضعیت‌ها</option>
                  {Object.entries(orderStatuses).map(([value, data]) => (
                    <option key={value} value={value}>
                      {data.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                جست‌وجو و فیلتر روی سفارش‌های همین صفحه اعمال می‌شوند.
              </p>
            </div>
          )}
          {filtered.length ? (
            <OrderRows orders={filtered} />
          ) : (
            <EmptyState
              icon={<Package />}
              title={
                orders.data?.orders.length
                  ? 'سفارشی با این مشخصات پیدا نشد'
                  : 'هنوز سفارشی در این صفحه ندارید'
              }
              description={
                orders.data?.orders.length
                  ? 'شماره سفارش یا وضعیت انتخاب‌شده را تغییر دهید.'
                  : 'بعد از خرید، وضعیت و جزئیات سفارش شما اینجا نمایش داده می‌شود.'
              }
              action={
                !orders.data?.orders.length && (
                  <Link href="/products" className={secondaryClass}>
                    مشاهده محصولات
                    <ArrowLeft className="size-4" />
                  </Link>
                )
              }
            />
          )}
          <Pagination
            page={page}
            pages={orders.data?.pages || 0}
            base="/account/orders"
          />
        </section>
      )}
    </>
  );
}
export function AccountOrderDetails({ id }: { id: number }) {
  const order = useAccountQuery('orders/' + id, orderDetailSchema);
  if (order.isPending) return <AccountLoading />;
  if (order.error)
    return (
      <AccountError error={order.error} retry={() => void order.refetch()} />
    );
  const data = order.data;
  const stages = ['ثبت سفارش', 'پردازش', 'ارسال', 'تحویل'];
  const stage = ['completed', 'delivered'].includes(data.status)
    ? 3
    : data.status === 'shipped'
      ? 2
      : [
            'processing',
            'processing-order',
            'preparing',
            'shetab-approval',
          ].includes(data.status)
        ? 1
        : 0;
  const cancelled = ['cancelled', 'failed', 'refunded'].includes(data.status);
  const trackingLinks: Record<string, string> = {
    post: 'https://tracking.post.ir/',
    tipax: 'https://tipaxco.com/tracking',
    mahex: 'https://mahex.com/',
    chapar: 'https://chapar.ir/',
  };
  return (
    <>
      <Link
        href="/account/orders"
        className="mb-4 inline-flex items-center gap-1 text-xs text-gray-500"
      >
        <ChevronRight className="size-4" />
        همه سفارش‌ها
      </Link>
      <SectionTitle
        title={'سفارش #' + data.number}
        subtitle={'ثبت‌شده در ' + accountDate(data.date)}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <OrderBadge status={data.status} />
            <button
              type="button"
              disabled={order.isFetching}
              onClick={() => void order.refetch()}
              className={secondaryClass}
            >
              <RefreshCw
                className={'size-4 ' + (order.isFetching ? 'animate-spin' : '')}
              />
              به‌روزرسانی وضعیت سفارش
            </button>
          </div>
        }
      />
      {['pending', 'on-hold', 'checkout-draft', 'failed'].includes(
        data.status,
      ) && (
        <p
          role="status"
          className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-7 text-amber-800"
        >
          {data.status === 'failed'
            ? 'پرداخت این سفارش ناموفق بوده است.'
            : data.status === 'on-hold'
              ? 'سفارش در انتظار بررسی فروشگاه است؛ تأیید نهایی پرداخت هنوز مشخص نیست.'
              : 'پرداخت این سفارش هنوز تأیید نشده است.'}{' '}
          برای بررسی پرداخت با پشتیبانی تماس بگیرید و شماره سفارش را اعلام کنید.
        </p>
      )}
      {!cancelled && (
        <section
          aria-label="مراحل سفارش"
          className={glass + ' mb-5 p-5 sm:p-6'}
        >
          <ol className="grid grid-cols-4 gap-2">
            {stages.map((title, index) => (
              <li
                key={title}
                aria-current={index === stage ? 'step' : undefined}
                className="flex flex-col items-center gap-3 text-center"
              >
                <span
                  className={
                    'flex size-10 items-center justify-center rounded-2xl ' +
                    (index <= stage
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-200'
                      : 'bg-gray-100 text-gray-400')
                  }
                >
                  {index < stage ? (
                    <Check className="size-4" />
                  ) : index === 2 ? (
                    <Truck className="size-4" />
                  ) : (
                    <Package className="size-4" />
                  )}
                </span>
                <span
                  className={
                    'text-[10px] sm:text-xs ' +
                    (index <= stage
                      ? 'font-bold text-gray-800'
                      : 'text-gray-400')
                  }
                >
                  {title}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_270px]">
        <div className="min-w-0 space-y-5">
          <section className={glass + ' p-5 sm:p-6'}>
            <h2 className="mb-5 font-bold">کالاهای سفارش</h2>
            <div className="divide-y divide-gray-100">
              {data.items.map((item) => (
                <div
                  key={item.id}
                  className="space-y-3 py-4 first:pt-0 last:pb-0"
                >
                  <p className="text-sm font-medium leading-7 text-gray-800">
                    {item.name}
                  </p>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-gray-500">
                      تعداد: {item.quantity.toLocaleString('fa-IR')}
                    </span>
                    <span className="font-bold text-gray-800">
                      {accountMoney(item.total, data.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className={glass + ' p-5 sm:p-6'}>
            <h2 className="mb-4 font-bold">اطلاعات گیرنده و تحویل</h2>
            <p className="text-sm leading-8 text-gray-600">
              {data.address.address || 'نشانی برای این سفارش ثبت نشده است.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
              <span>{data.address.name}</span>
              {data.address.phone && (
                <span>
                  تماس: <bdi>{data.address.phone}</bdi>
                </span>
              )}
              {data.address.postcode && (
                <span>
                  کد پستی: <bdi>{data.address.postcode}</bdi>
                </span>
              )}
            </div>
            {data.trackingNumber && (
              <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 text-sm text-cyan-800">
                <p>
                  کد رهگیری مرسوله:{' '}
                  <bdi className="font-bold">{data.trackingNumber}</bdi>
                </p>
                {trackingLinks[data.shippingCompany] && (
                  <a
                    href={trackingLinks[data.shippingCompany]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-xs font-bold"
                  >
                    پیگیری مرسوله
                    <ArrowLeft className="size-4" />
                  </a>
                )}
              </div>
            )}
            {!data.trackingNumber && (
              <p className="mt-5 rounded-2xl bg-gray-50 p-4 text-xs leading-7 text-gray-500">
                کد رهگیری مرسوله هنوز ثبت نشده است. پس از ثبت توسط فروشگاه، در
                همین قسمت نمایش داده می‌شود.
              </p>
            )}
          </section>
          {!!data.notes.length && (
            <section className={glass + ' p-5 sm:p-6'}>
              <h2 className="mb-4 font-bold">یادداشت‌های فروشگاه</h2>
              <div className="space-y-3">
                {data.notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-2xl bg-orange-50/60 p-4"
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-8 text-gray-700">
                      {note.content}
                    </p>
                    <p className="mt-2 text-[11px] text-gray-500">
                      {accountDate(note.date)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className={glass + ' space-y-5 p-5'}>
          <h2 className="font-bold">خلاصه پرداخت</h2>
          <dl className="space-y-4 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">روش پرداخت</dt>
              <dd>{data.paymentMethod || 'ثبت نشده'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">هزینه ارسال</dt>
              <dd>{accountMoney(data.shippingTotal, data.currency)}</dd>
            </div>
            {Number(data.discountTotal) > 0 && (
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">تخفیف سفارش</dt>
                <dd className="text-emerald-700">
                  {accountMoney(data.discountTotal, data.currency)}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-2 border-t border-gray-100 pt-4 font-bold">
              <dt>مبلغ سفارش</dt>
              <dd>{accountMoney(data.total, data.currency)}</dd>
            </div>
          </dl>
          <Link href="/account/support" className={secondaryClass + ' w-full'}>
            پشتیبانی این سفارش
          </Link>
        </aside>
      </div>
    </>
  );
}
