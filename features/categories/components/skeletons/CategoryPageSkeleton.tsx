import { Skeleton } from "@/components/ui/skeleton";

import { SkeletonStatus } from "@/components/common/SkeletonStatus";

interface CategoryPageSkeletonProps {
  items?: number;
}

/** هم‌شکل با صفحه‌ی دسته‌بندی: بردکرامب، سربرگ دسته و شبکه‌ی محصولات. */
export function CategoryPageSkeleton({ items = 8 }: CategoryPageSkeletonProps) {
  return (
    <SkeletonStatus className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="h-4 w-12 rounded-md" />
        <Skeleton className="h-3 w-2 rounded-md" />
        <Skeleton className="h-4 w-16 rounded-md" />
        <Skeleton className="h-3 w-2 rounded-md" />
        <Skeleton className="h-4 w-24 rounded-md" />
      </div>

      <div className="mb-8 flex items-center gap-4 rounded-xl bg-orange-50 p-4">
        <Skeleton className="h-16 w-16 shrink-0 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-32 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: items }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-lg border">
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-2/3 rounded-md" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}
