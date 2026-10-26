import type { Metadata } from 'next';
import { Checkout } from '@/features/cart';
export const metadata: Metadata = { title: 'تسویه‌حساب', robots: { index: false, follow: false } };
export default async function CheckoutPage({ searchParams }: {
  searchParams: Promise<{ step?: string | string[] }>;
}) {
  const { step } = await searchParams;
  return <Checkout requestedStep={step === 'payment' ? 'payment' : 'shipping'} />;
}

