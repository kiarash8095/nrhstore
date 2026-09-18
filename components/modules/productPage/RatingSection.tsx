import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Rating } from "@/components/reui/rating";
import { e2p } from "@/utils/numbers";
import { Products } from "@/types/products-types";

interface RatingSectionProps {
  product: Products;
}

const distribution = [
  {
    label: "مثبت",
    count: 124,
    percentage: 62,
    color: "text-green-600",
    indicatorClass: "**:data-[slot=progress-indicator]:bg-green-500",
  },
  {
    label: "بی طرف",
    count: 18,
    percentage: 9,
    color: "text-orange-500",
    indicatorClass: "**:data-[slot=progress-indicator]:bg-orange-500",
  },
  {
    label: "منفی",
    count: 13,
    percentage: 7,
    color: "text-red-600",
    indicatorClass: "**:data-[slot=progress-indicator]:bg-red-500",
  },
];

export function RatingSection({ product }: RatingSectionProps) {
  console.log(product)
  return (
    <div className="mx-auto w-full max-w-xs space-y-3 sm:space-y-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-xl font-semibold text-black sm:text-2xl">
          {e2p(product.average_rating)}
        </span>
        <Rating
          rating={Number(product.average_rating)}
          maxRating={5}
          size="sm"
        />
        <span className="text-muted-foreground text-[10px] sm:text-xs">
          بر اساس {e2p(product.review_count)} دیدگاه
        </span>
      </div>
      <Separator />
      <div className="space-y-2">
        {distribution.map((row) => (
          <div
            key={row.label}
            className="flex items-center gap-2 text-xs sm:gap-3 sm:text-sm"
          >
            <span
              className={`w-12 text-right text-[10px] font-medium sm:w-14 sm:text-xs ${row.color}`}
            >
              {row.label}
            </span>
            <Progress
              value={row.percentage}
              className={`flex-1 ${row.indicatorClass} **:data-[slot=progress-track]:h-1 sm:**:data-[slot=progress-track]:h-1.5`}
            />
            <span className="text-muted-foreground w-6 text-right text-[10px] sm:w-7 sm:text-xs">
              {row.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
