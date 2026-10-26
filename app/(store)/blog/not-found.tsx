import Link from "next/link";
import { BookOpenText } from "lucide-react";

export default function BlogNotFound() {
  return (
    <main className="mx-auto my-12 w-[92%] max-w-xl rounded-3xl border border-gray-100 bg-white px-6 py-12 text-center">
      <BookOpenText
        className="mx-auto mb-5 size-12 text-orange-300"
        aria-hidden="true"
      />
      <h1 className="text-xl font-bold">مقاله یا صفحه موردنظر پیدا نشد</h1>
      <p className="mt-4 text-sm leading-7 text-gray-500">
        ممکن است نشانی تغییر کرده باشد یا این مقاله هنوز منتشر نشده باشد.
      </p>
      <Link
        href="/blog"
        className="mt-7 inline-block rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white"
      >
        بازگشت به مجله
      </Link>
    </main>
  );
}
