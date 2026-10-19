import { Skeleton } from "@/components/ui/skeleton";

import { SkeletonStatus } from "@/components/common/SkeletonStatus";
import { ProductCardSkeleton } from "./ProductCardSkeleton";

interface ProductSectionSkeletonProps {
  /** تعداد کارت‌ها؛ پیش‌فرض با چیدمان چهارستونه دسکتاپ هم‌خوان است */
  items?: number;
}

/**
 * هم‌شکل با ProductSection؛ ردیف اسلایدر بدون دکمه‌های ناوبری رندر می‌شود
 * تا کاربر در حین بارگذاری، کنترل تعاملیِ بی‌اثر نبیند.
 */
export function ProductSectionSkeleton({
  items = 4,
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

      <div className="-ms-4 flex items-stretch overflow-hidden py-2">
        {Array.from({ length: items }).map((_, index) => (
          <div
            key={index}
            className="flex min-w-0 shrink-0 grow-0 basis-[85%] ps-4 sm:basis-[45%] lg:basis-1/4"
          >
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}
