import { Skeleton } from "@/components/ui/skeleton";

import { ProductCardSkeleton } from "./ProductCardSkeleton";
import { SkeletonStatus } from "./SkeletonStatus";

interface ProductSectionSkeletonProps {
  /** تعداد کارت‌ها؛ پیش‌فرض با چیدمان سه‌ستونه دسکتاپ هم‌خوان است */
  items?: number;
}

/**
 * هم‌شکل با ProductSection؛ ردیف اسلایدر بدون دکمه‌های ناوبری رندر می‌شود
 * تا کاربر در حین بارگذاری، کنترل تعاملیِ بی‌اثر نبیند.
 */
export function ProductSectionSkeleton({
  items = 3,
}: ProductSectionSkeletonProps) {
  return (
    <SkeletonStatus className="my-12 w-full sm:my-16">
      <div className="mb-5 flex items-center gap-3 sm:mb-7">
        <Skeleton className="h-12 w-12 shrink-0 rounded-2xl sm:h-14 sm:w-14" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40 rounded-md sm:h-8 sm:w-56" />
          <Skeleton className="h-3.5 w-16 rounded-md sm:h-4 sm:w-20" />
        </div>
      </div>

      <div className="-ms-3 flex overflow-hidden py-3">
        {Array.from({ length: items }).map((_, index) => (
          <div
            key={index}
            className="w-[88%] shrink-0 ps-3 sm:w-1/2 lg:w-1/3"
          >
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}
