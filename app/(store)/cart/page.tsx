import type { Metadata } from 'next';
import { Cart } from '@/features/cart';
export const metadata: Metadata = { title: 'سبد خرید', robots: { index: false, follow: false } };
export default function CartPage() { return <Cart />; }

