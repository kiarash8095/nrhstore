import { Rating } from "@/components/ui/rating";
import { Products } from "@/features/products/types/product.types";
import { e2p } from "@/utils/numbers";

interface RatingSectionProps {
  product: Products;
}



export function RatingSection({ product }: RatingSectionProps) {
  if (product.review_count === 0) return <p className="text-sm text-gray-500">هنوز دیدگاهی برای این محصول ثبت نشده است.</p>;

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
    </div>
  );
}
