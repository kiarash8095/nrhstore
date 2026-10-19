import Link from "next/link";
import type { ComponentType } from "react";

import {
Carousel,
CarouselContent,
CarouselItem,
CarouselNext,
CarouselPrevious,
} from "@/components/ui/carousel";
import type { Products } from "@/features/products/types/product.types";
import { ProductCard } from "./ProductCard";

interface ProductSectionProps {
  title: string;
  products: Products[];
  icon: ComponentType<{ className?: string }>;
  moreHref?: string;
  moreLabel?: string;
}

export function ProductSection({
  title,
  products,
  icon: Icon,
  moreHref = "/products",
  moreLabel = "نمایش همه",
}: ProductSectionProps) {
  return (
    <section
      className="my-12 w-full sm:my-16"
      aria-labelledby={`${title}-heading`}
    >
      <div className="mb-5 flex items-center justify-between gap-4 sm:mb-7">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center
           rounded-2xl border border-orange-100 bg-orange-50 text-orange-500 sm:h-14 sm:w-14"
          >
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <h2
              id={`${title}-heading`}
              className="truncate text-lg font-black text-gray-900 sm:text-2xl"
            >
              {title}
            </h2>
            <Link
              href={moreHref}
              className="mt-1 inline-block text-xs font-medium text-gray-500 transition hover:text-orange-500 sm:text-sm"
            >
              {moreLabel}
            </Link>
          </div>
        </div>
      </div>

      {products.length > 0 ? (
        <div className="relative w-full">
          <Carousel
            opts={{ align: "start", direction: "rtl" }}
            className="w-full"
          >
            <CarouselContent className="-ms-4 items-stretch py-2">
              {products.map((product) => (
                <CarouselItem
                  key={product.id}
                  className="flex basis-[85%] ps-4 sm:basis-[45%] lg:basis-[30%]"
                >
                  <ProductCard product={product} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious
              className="-start-2 z-10 hidden size-10 border-gray-200 bg-white shadow-sm hover:bg-orange-50 sm:flex"
              aria-label="محصولات قبلی"
            />
            <CarouselNext
              className="-end-2 z-10 hidden size-10 border-gray-200 bg-white shadow-sm hover:bg-orange-50 sm:flex"
              aria-label="محصولات بعدی"
            />
          </Carousel>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500">
          محصولی برای نمایش وجود ندارد.
        </div>
      )}
    </section>
  );
}
