import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { SkeletonStatus } from "./SkeletonStatus";

interface CategoriesSkeletonProps {
  items?: number;
}

/** هم‌شکل با بخش «دسته‌ها» در صفحه اصلی (۶ ستون در دسکتاپ). */
export function CategoriesSkeleton({ items = 6 }: CategoriesSkeletonProps) {
  return (
    <SkeletonStatus className="my-15 w-full">
      <div className="mb-7 flex items-center gap-3">
        <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-28 rounded-md sm:h-8" />
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
      </div>

      <div className="flex overflow-hidden">
        {Array.from({ length: items }).map((_, index) => (
          <div key={index} className="w-1/2 shrink-0 p-1 sm:w-1/3 lg:w-1/6">
            <Card className="h-44 sm:h-48">
              <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-4">
                <Skeleton className="h-28 w-28 rounded-full" />
                <Skeleton className="h-4 w-20 rounded-md" />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}
