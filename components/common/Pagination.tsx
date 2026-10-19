import Link from 'next/link';
import { pagePath } from '@/lib/urls';
import { e2p } from '@/utils/numbers';

export function Pagination({ path, page, totalPages }: { path: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="صفحه‌بندی محصولات" className="my-8 flex items-center justify-center gap-6 text-sm">
      {page > 1 && <Link className="rounded-lg border px-4 py-2" href={pagePath(path, page - 1)}>صفحه قبل</Link>}
      <span aria-current="page">صفحه {e2p(page)} از {e2p(totalPages)}</span>
      {page < totalPages && <Link className="rounded-lg border px-4 py-2" href={pagePath(path, page + 1)}>صفحه بعد</Link>}
    </nav>
  );
}
