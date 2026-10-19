import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { SkeletonStatus } from "@/components/common/SkeletonStatus";

interface MainMenuSkeletonProps {
  /** تعداد ردیف‌های زیردسته؛ پیش‌فرض هم‌اندازه با ارتفاع ستون مگامنو */
  rows?: number;
  className?: string;
}

const ROW_WIDTHS = ["w-full", "w-5/6", "w-4/5", "w-3/4", "w-11/12"];

/** اسکلتون فهرست زیردسته‌ها در مگامنوی هدر. */
export function MainMenuSkeleton({
  rows = 4,
  className,
}: MainMenuSkeletonProps) {
  return (
    <SkeletonStatus className={cn("flex flex-col gap-0.5", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-9 rounded-lg", ROW_WIDTHS[index % ROW_WIDTHS.length])}
        />
      ))}
    </SkeletonStatus>
  );
}
