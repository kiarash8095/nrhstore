import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { SkeletonStatus } from "@/components/common/SkeletonStatus";

interface SearchResultsSkeletonProps {
  rows?: number;
  /** sm برای دراپ‌داون دسکتاپ و md برای شیت تمام‌صفحه موبایل */
  size?: "sm" | "md";
  className?: string;
}

/** هم‌شکل با ردیف‌های نتیجه جستجوی هدر (تصویر، نام کالا و قیمت). */
export function SearchResultsSkeleton({
  rows = 4,
  size = "sm",
  className,
}: SearchResultsSkeletonProps) {
  const isCompact = size === "sm";

  return (
    <SkeletonStatus className={cn("space-y-1", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={cn("flex items-center gap-3", isCompact ? "p-2" : "p-3")}
        >
          <Skeleton
            className={cn(
              "shrink-0 rounded-xl",
              isCompact ? "h-12 w-12" : "h-14 w-14",
            )}
          />

          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/4 rounded-md" />
            <Skeleton className="h-3.5 w-24 rounded-md" />
          </div>
        </div>
      ))}
    </SkeletonStatus>
  );
}
