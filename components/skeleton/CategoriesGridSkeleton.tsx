import { Skeleton } from "@/components/ui/skeleton";

import { SkeletonStatus } from "./SkeletonStatus";

interface CategoriesGridSkeletonProps {
  items?: number;
  /** سربرگ صفحه‌ی دسته‌بندی‌ها را هم اسکلتون می‌کند؛ برای loading مسیر */
  withHeader?: boolean;
}

const GRID_CLASSES =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5";

/** هم‌شکل با CategoriesGrid و CategoryCard. */
export function CategoriesGridSkeleton({
  items = 10,
  withHeader = true,
}: CategoriesGridSkeletonProps) {
  return (
    <SkeletonStatus
      label="در حال بارگذاری دسته‌بندی‌ها…"
      className={withHeader ? "mx-auto w-[92%] max-w-7xl py-8 sm:py-12" : undefined}
    >
      {withHeader && (
        <div className="mb-6 flex items-center gap-3 sm:mb-10">
          <Skeleton className="h-12 w-12 shrink-0 rounded-2xl sm:h-14 sm:w-14" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-36 rounded-md sm:h-8" />
            <Skeleton className="h-3.5 w-52 rounded-md sm:h-4" />
          </div>
        </div>
      )}

      <div className={GRID_CLASSES}>
        {Array.from({ length: items }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
          >
            <Skeleton className="h-28 w-full rounded-none sm:h-36" />

            <div className="flex flex-1 flex-col p-3 sm:p-4">
              <div className="min-h-10 space-y-1.5 sm:min-h-12 sm:space-y-2">
                <Skeleton className="h-4 w-full rounded-md sm:h-5" />
                <Skeleton className="h-4 w-2/3 rounded-md sm:h-5" />
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}
