import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * هم‌شکل با ProductCard تا هنگام بارگذاری، جای نهایی کارت در ذهن کاربر تثبیت شود.
 */
export function ProductCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden rounded-2xl border border-gray-100 bg-white py-0 shadow-sm">
      <CardContent className="flex h-full min-h-[420px] flex-col p-3 sm:min-h-[450px] sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-6 w-[70px] rounded-full" />
          <Skeleton className="h-6 w-[52px] rounded-full" />
        </div>

        <Skeleton className="my-3 aspect-square w-full rounded-xl sm:my-4" />

        <div className="min-h-12 space-y-2 pt-1">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4 max-md:flex-col">
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-lg max-md:h-12 max-md:w-[85%]" />
        </div>
      </CardContent>
    </Card>
  );
}
