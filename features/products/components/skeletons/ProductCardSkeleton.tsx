import { Card,CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * هم‌شکل با ProductCard تا هنگام بارگذاری، جای نهایی کارت در ذهن کاربر تثبیت شود.
 */
export function ProductCardSkeleton() {
  return (
    <Card className="h-[28.25rem] w-full min-w-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white py-0 shadow-sm ring-0 sm:h-[29.5rem]">
      <CardContent className="flex h-full min-w-0 flex-col p-4">
        <div className="flex h-6 shrink-0 items-center justify-between gap-2">
          <Skeleton className="h-6 w-[70px] rounded-full" />
          <Skeleton className="h-6 w-[52px] rounded-full" />
        </div>

        <Skeleton className="my-4 h-44 w-full shrink-0 rounded-xl sm:h-48" />

        <div className="h-18 shrink-0 space-y-2 pt-1">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
        </div>

        <div className="mt-auto border-t border-gray-100 pt-3">
          <div className="mb-3 flex h-7 items-center justify-end">
            <Skeleton className="h-6 w-28 rounded-md" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}
