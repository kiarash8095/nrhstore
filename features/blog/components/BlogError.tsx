"use client";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

export function BlogError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto my-12 w-[92%] max-w-xl rounded-3xl border border-orange-100 bg-white px-6 py-12 text-center">
      <h1 className="text-xl font-bold text-gray-900">
        مجله موقتاً در دسترس نیست
      </h1>
      <p className="mt-4 text-sm leading-7 text-gray-500">
        دریافت مقاله‌ها انجام نشد. کمی بعد دوباره تلاش کنید.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white"
      >
        <RefreshCw aria-hidden="true" className="size-4" />
        تلاش دوباره
      </button>
      <Link href="/" className="mx-4 mt-4 inline-block text-sm text-gray-500">
        بازگشت به خانه
      </Link>
    </main>
  );
}
