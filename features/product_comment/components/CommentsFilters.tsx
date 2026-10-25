export function CommentsFilters({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-xs" dir="rtl">
      <span className="font-bold text-gray-700">دیدگاه‌های تأییدشده</span>
      <span className="text-gray-400">{count.toLocaleString("fa-IR")} مورد</span>
    </div>
  );
}
