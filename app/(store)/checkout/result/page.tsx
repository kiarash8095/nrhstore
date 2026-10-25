import type { Metadata } from 'next';
import { PaymentResult } from '@/features/payments';
export const metadata: Metadata = { title: 'نتیجه پرداخت', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function PaymentResultPage({ searchParams }: { searchParams: Promise<{ order?: string | string[] }> }) {
  const { order } = await searchParams;
  const orderId = typeof order === 'string' && /^[1-9][0-9]{0,14}$/.test(order) && Number.isSafeInteger(Number(order)) ? Number(order) : null;
  return <PaymentResult orderId={orderId} />;
}
