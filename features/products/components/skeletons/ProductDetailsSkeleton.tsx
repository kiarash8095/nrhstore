import { Skeleton } from "@/components/ui/skeleton";

import { SkeletonStatus } from "@/components/common/SkeletonStatus";
import { ProductSectionSkeleton } from "./ProductSectionSkeleton";

const DETAIL_ROWS = [0, 1, 2, 3];
const DESCRIPTION_LINES = ["w-full", "w-11/12", "w-10/12", "w-1/2"];

/** هم‌شکل با صفحه‌ی جزئیات محصول: بردکرامب، سه ستون اصلی، مراحل و محصولات مرتبط. */
export function ProductDetailsSkeleton() {
  return (
    <SkeletonStatus className="w-full">
      <div className="mx-[2.5%] my-6 flex items-center gap-2 sm:my-10">
        <Skeleton className="h-4 w-12 rounded-md" />
        <Skeleton className="h-3 w-2 rounded-md" />
        <Skeleton className="h-4 w-16 rounded-md" />
        <Skeleton className="h-3 w-2 rounded-md" />
        <Skeleton className="h-4 w-32 rounded-md" />
      </div>

      <div className="mx-auto my-6 flex w-[95%] flex-col gap-4 rounded-lg bg-white p-2 sm:my-10 sm:p-3 lg:flex-row lg:gap-2">
        {/* ستون تصاویر */}
        <div className="flex w-full flex-col items-center rounded-lg p-2 sm:p-3 lg:w-md lg:max-w-md">
          <Skeleton className="aspect-square w-full max-w-[350px] rounded-lg" />
          <div className="my-6 flex gap-2 sm:my-12 sm:gap-4">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-20 w-20 rounded-lg" />
            ))}
          </div>
        </div>

        {/* ستون نام و ویژگی‌های کلیدی */}
        <div className="flex w-full flex-col items-start rounded-lg p-2 sm:p-3 lg:w-md">
          <Skeleton className="h-5 w-full rounded-md sm:h-6" />

          <div className="my-4 flex w-full flex-col gap-3 sm:my-6 sm:gap-4">
            <Skeleton className="h-3 w-56 rounded-md" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>

          <Skeleton className="h-4 w-16 rounded-md" />

          <div className="my-3 flex flex-wrap gap-2 sm:my-4 sm:gap-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-10 w-28 rounded-lg" />
            ))}
          </div>
        </div>

        {/* ستون قیمت و اقدام خرید */}
        <div className="w-full rounded-lg bg-gray-100 p-3 sm:p-4 lg:w-xs">
          <Skeleton className="mb-4 h-4 w-20 rounded-md sm:mb-6" />

          {DETAIL_ROWS.map((row) => (
            <div
              key={row}
              className="flex items-center gap-2 border-b border-dashed border-red-300 p-2 sm:p-3"
            >
              <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="ms-auto h-4 w-12 rounded-md" />
            </div>
          ))}

          <div className="my-6 sm:my-10">
            <Skeleton className="h-8 w-36 rounded-md" />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-4">
              <Skeleton className="h-9 w-48 rounded-md" />
              <Skeleton className="h-9 w-12 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* نوار مراحل (توضیحات / مشخصات / دیدگاه) */}
      <div className="mx-auto flex w-[95%] flex-col gap-8 lg:flex-row lg:justify-between lg:gap-5">
        <div className="flex w-full flex-col lg:w-md">
          <Skeleton className="mb-6 h-16 w-full rounded-2xl" />

          <div className="mb-4 flex items-center gap-3 p-2">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-px flex-1 rounded-none" />
          </div>

          <div className="mb-4 space-y-3 rounded-xl p-2 shadow-xl sm:p-4">
            {DESCRIPTION_LINES.map((width) => (
              <Skeleton key={width} className={`h-3.5 rounded-md ${width}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto w-[95%]">
        <ProductSectionSkeleton />
      </div>
    </SkeletonStatus>
  );
}
