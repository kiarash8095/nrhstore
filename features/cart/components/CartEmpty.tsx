import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
export function CartEmpty() {
  return <div className="flex min-h-72 flex-col items-center justify-center gap-4 py-10 text-center">
    <span className="rounded-full bg-orange-50 p-6"><ShoppingBag className="size-10 text-orange-400" /></span>
    <h2 className="text-lg font-bold">سبد خرید شما خالی است</h2>
    <p className="max-w-xs text-sm leading-7 text-gray-500">محصول موردنظرتان را پیدا کنید و به سبد خرید اضافه کنید.</p>
    <Link href="/products" className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600">مشاهده محصولات</Link>
  </div>;
}

