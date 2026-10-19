import Link from 'next/link';

export default function NotFound() {
  return <main className="mx-auto max-w-xl px-4 py-16 text-center">
    <h1 className="mb-4 text-2xl font-bold">صفحه مورد نظر پیدا نشد</h1>
    <p className="mb-6">این آدرس وجود ندارد یا تغییر کرده است.</p>
    <Link className="text-orange-600" href="/products">مشاهده محصولات فروشگاه</Link>
  </main>;
}
