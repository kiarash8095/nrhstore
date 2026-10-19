import type { Metadata } from 'next';
import { Checkout } from '@/features/cart';
export const metadata: Metadata = { title: 'تسویه‌حساب', robots: { index: false, follow: false } };
export default function CheckoutPage() { return <Checkout />; }

