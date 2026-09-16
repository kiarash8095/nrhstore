import Image from "next/image";
import Link from "next/link";
import { FaStar } from "react-icons/fa";
import { MdAddShoppingCart } from "react-icons/md";

import PackageIcon from "@/components/icons/PackageIcon";
import ToomaanIcon from "@/components/icons/ToomaanIcon";
import { Card, CardContent } from "@/components/ui/card";
import { sp } from "@/utils/numbers";
import { shortText } from "@/utils/shortText";
import type { Products } from "@/types/products";

interface ProductCardProps {
  product: Products;
}

export function ProductCard({ product }: ProductCardProps) {
  const image = product.images[0]?.src || "/placeholder.png";

  return (
    <Card className="group h-full w-[90%] mx-auto overflow-hidden rounded-2xl border border-gray-100 bg-white py-0 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl">
      <Link
        href={`/products/${product.slug}`}
        className="flex h-full min-h-[420px] flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 sm:min-h-[450px]"
      >
        <CardContent className="flex h-full flex-col p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${product.is_in_stock ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
            >
              <PackageIcon />
              {product.is_in_stock ? "موجود" : "ناموجود"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-gray-600">
              <FaStar className="text-orange-400" aria-hidden="true" />
              {product.review_count}
            </span>
          </div>

          <div className="relative my-3 flex aspect-square w-[90%] items-center justify-center overflow-hidden rounded-xl bg-gray-50 p-4 sm:my-4">
            <Image
              src={image}
              width={200}
              height={200}
              alt={product.name}
              className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
            />
          </div>

          <h3 className="min-h-12 text-sm font-bold leading-6 text-gray-800 transition group-hover:text-orange-500 sm:text-base">
            {shortText(product.name)}
          </h3>

          <div className="mt-auto flex items-center justify-between gap-3 pt-4 max-md:flex-col">
            <div className="flex items-center gap-1 text-base font-black text-gray-900">
              <span className="text-lg max-md:text-base">
                {sp(product.prices.price)}
              </span>
              <ToomaanIcon />
            </div>
            <span className="flex whitespace-nowrap items-center rounded-lg bg-gray-900 px-5 py-2 text-xs
             font-bold text-white transition group-hover:bg-orange-500 sm:px-4 sm:text-sm max-md:w-[85%] max-md:justify-center max-md:py-4">
              مشاهده محصول
              <MdAddShoppingCart className="mr-1 inline-block text-lg" />
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
