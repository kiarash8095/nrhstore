'use client';
import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleAlert, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { getAuthIdentity, useAuth, useAuthActions } from '@/features/auth';
import { paymentStatus } from '../api';

export function PaymentResult({ orderId }: { orderId: number | null }) {
  const auth = useAuth();
  const { openAuth } = useAuthActions();
  const client = useQueryClient();
  const finalized = useRef<number | null>(null);
  const key = ['payment-result', auth.user?.id, orderId];
  const result = useQuery({
    queryKey: key, queryFn: () => paymentStatus(orderId!), enabled: auth.isAuthenticated && orderId !== null,
    retry: false, refetchOnWindowFocus: false, staleTime: 0,
  });
  const refresh = useMutation({
    mutationFn: ({ id }: { id: number; identity: string }) => paymentStatus(id, true), retry: false,
    onSuccess: (value, submitted) => {
      if (getAuthIdentity() !== submitted.identity) return;
      client.setQueryData(['payment-result', submitted.identity, submitted.id], value);
      if (value.paid) void client.invalidateQueries({ queryKey: ['cart', submitted.identity] });
    },
  });
  // A paid order can clear only the unchanged cart that created it (checked in PHP).
  const finalize = refresh.mutate;
  useEffect(() => {
    if (result.data?.paid && orderId && auth.user && finalized.current !== orderId) {
      finalized.current = orderId;
      finalize({ id: orderId, identity: auth.user.id });
    }
  }, [result.data?.paid, orderId, auth.user, finalize]);
  const data = result.data;
  return <main className="mx-auto my-12 w-[92%] max-w-xl rounded-2xl border border-gray-200 bg-white p-7 text-center">
    <h1 className="mb-5 text-xl font-bold">نتیجه پرداخت</h1>
    {!orderId ? <p role="alert">شماره سفارش معتبر نیست.</p> : !auth.isAuthenticated ? <>
      <p className="mb-5 leading-8">برای مشاهده نتیجه سفارش، وارد حساب خریدار شوید.</p>
      <button onClick={() => openAuth({ nextPath: '/checkout/result?order=' + orderId })} className="rounded-xl bg-orange-600 px-5 py-3 text-white">ورود به حساب</button>
    </> : result.isPending ? <LoaderCircle className="mx-auto size-8 animate-spin" aria-label="بررسی سفارش" /> : <>
      {data?.paid ? <>
        <CheckCircle2 className="mx-auto mb-4 size-12 text-emerald-600" />
        <p role="status" className="font-bold text-emerald-700">پرداخت سفارش تأیید شد.</p>
        <p className="mt-4">شماره سفارش: {data.order_id.toLocaleString('fa-IR')}</p>
        {data.reference && <p className="mt-3">کد پیگیری: {data.reference}</p>}
      </> : <>
        <CircleAlert className="mx-auto mb-4 size-10 text-orange-600" />
        <p role="status" className="leading-8">پرداخت این سفارش هنوز تأیید نشده است. اگر وجه کسر شده، دوباره پرداخت نکنید و وضعیت سفارش را بررسی کنید.</p>
      </>}
      {(result.error || refresh.error) && <p role="alert" className="mt-4 leading-8 text-red-700">{(refresh.error || result.error)?.message}</p>}
      {!data?.paid && <button disabled={refresh.isPending} onClick={() => refresh.mutate({ id: orderId, identity: auth.user!.id })} className="mt-6 rounded-xl bg-gray-900 px-5 py-3 text-white disabled:opacity-50">{refresh.isPending ? 'در حال بررسی…' : 'بررسی دوباره وضعیت'}</button>}
    </>}
    <Link href="/products" className="mt-7 block text-sm text-gray-600 underline">بازگشت به فروشگاه</Link>
  </main>;
}
