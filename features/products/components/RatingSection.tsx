import { CommentsSection } from "@/features/product_comment/index";
import { Products } from "@/features/products/types/product.types";

interface RatingSectionProps {
  product: Products;
}



export function RatingSection({ product }: RatingSectionProps) {
  return <CommentsSection productId={product.id} averageRating={product.average_rating} reviewCount={product.review_count} />;
}
