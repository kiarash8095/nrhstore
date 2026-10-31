import Link from 'next/link';
import { Building2, ClipboardList, Clock3, Phone } from 'lucide-react';
import type { PaymentStatus } from '../contracts';

const accountLabels = { account_name: 'صاحب حساب', bank_name: 'بانک', account_number: 'شماره حساب', iban: 'شماره شبا', sort_code: 'کد شعبه', bic: 'کد بانکی' } as const;

export function BankTransferDetails({ data }: { data: PaymentStatus }) {
  const waiting = data.status === 'on-hold' && data.payment_state === 'transfer_pending';
  const closed = ['cancelled', 'failed', 'refunded'].includes(data.status);
  return <div className="text-right">
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50/70 p-4"><Clock3 className="mt-1 size-5 shrink-0 text-orange-600" /><div><p role="status" className="text-sm font-bold">{closed ? 'این سفارش در انتظار واریز نیست.' : waiting ? 'سفارش شما ثبت شد؛ در انتظار تأیید واریز' : 'ثبت سفارش در حال بررسی است.'}</p><p className="mt-2 text-xs leading-7 text-muted-foreground">{closed ? 'پیش از هر واریز تازه، وضعیت سفارش را با پشتیبانی بررسی کنید.' : waiting ? 'ثبت سفارش به معنی پرداخت‌شدن آن نیست. پس از واریز، شماره سفارش را برای پیگیری به پشتیبانی اعلام کنید.' : 'دستور واریز پس از تکمیل ثبت سفارش نمایش داده می‌شود. پیش از واریز، وضعیت سفارش را دوباره بررسی کنید.'}</p></div></div>
    <p className="mb-5 flex items-center justify-between rounded-xl border border-border p-4 text-sm"><span className="flex items-center gap-2 text-muted-foreground"><ClipboardList className="size-4" />شماره سفارش / ارجاع واریز</span><strong className="select-all">{data.order_id.toLocaleString('fa-IR')}</strong></p>
    {waiting && data.bank_transfer && <>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><Building2 className="size-4 text-orange-600" />راهنمای انتقال مستقیم بانکی</h2>
      {data.bank_transfer.instructions && <p className="mb-5 whitespace-pre-line text-sm leading-8 text-muted-foreground">{data.bank_transfer.instructions}</p>}
      <div className="space-y-4">{data.bank_transfer.accounts.map((account, index) => <dl key={index} className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">{Object.entries(accountLabels).map(([key, label]) => account[key as keyof typeof account] ? <div key={key} className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 break-all font-medium" dir="auto"><bdi className="select-all">{account[key as keyof typeof account]}</bdi></dd></div> : null)}</dl>)}</div>
      {!data.bank_transfer.accounts.length && <p className="text-sm leading-8 text-muted-foreground">اطلاعات حساب در این سفارش ارائه نشده است. پیش از واریز با پشتیبانی تماس بگیرید.</p>}
    </>}
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4"><Link href={'/account/orders/' + data.order_id} className="text-sm font-bold text-orange-700 underline-offset-4 hover:underline">مشاهده سفارش در حساب من</Link><a href="tel:08131775" className="inline-flex items-center gap-2 text-xs text-muted-foreground"><Phone className="size-4" />پشتیبانی: <bdi>۰۸۱–۳۱۷۷۵</bdi></a></div>
  </div>;
}
