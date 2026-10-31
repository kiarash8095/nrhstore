import { Skeleton } from "@/components/ui/skeleton";

import { SkeletonStatus } from "../common/SkeletonStatus";

/**
 * هم‌شکل با قفسه‌ی هدر (لوگو، جستجو، دکمه‌ها) و نوار دسته‌بندی زیر آن؛
 * ارتفاع‌ها با نسخه‌ی واقعی هم‌خوان است تا هنگام جای‌گذاری، صفحه جابه‌جا نشود.
 */
export function HeaderSkeleton() {
  return (
    <SkeletonStatus label="در حال بارگذاری منو…" className="w-full">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-sm">
        <div className="mx-auto flex w-[95%] max-w-[1400px] items-center justify-between gap-3 py-3 lg:gap-5">
          <div className="flex min-w-0 w-full flex-col items-center gap-3 md:flex-row md:gap-7">
            <Skeleton className="h-10 w-[130px] shrink-0 rounded-lg sm:w-[150px] lg:w-[180px]" />
            <Skeleton className="h-13 w-full rounded-xl md:max-w-[520px] md:flex-1" />
          </div>

          <div className="flex shrink-0 items-center gap-2 max-md:hidden sm:gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="h-11 w-11 rounded-full" />
          </div>
        </div>
      </header>

      <nav className="mx-auto mt-4 w-[92%] max-w-[1400px]">
        <div className="flex items-center justify-start gap-3">
          <Skeleton className="h-10 w-full max-w-[200px] rounded-md" />

          <div className="mr-10 flex items-center gap-3 max-md:hidden lg:gap-5">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-4 w-16 rounded-md" />
            ))}
          </div>
        </div>
      </nav>
    </SkeletonStatus>
  );
}
