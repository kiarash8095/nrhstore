"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl px-4 py-16 text-center">
    <h1 className="mb-4 text-xl font-bold">دریافت اطلاعات ممکن نشد</h1>
    <p className="mb-6">ارتباط با فروشگاه موقتاً برقرار نیست. لطفاً دوباره تلاش کنید.</p>
    <button type="button" onClick={reset} className="rounded-lg bg-black px-5 py-3 text-white">تلاش دوباره</button>
  </main>;
}
