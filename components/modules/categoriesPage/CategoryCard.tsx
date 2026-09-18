import Image from "next/image";
import Link from "next/link";
import { HiOutlineViewGrid } from "react-icons/hi";
import { IoIosArrowBack } from "react-icons/io";

import type { Category } from "@/types/category-types";
import { e2p } from "@/utils/numbers";

interface CategoryCardProps {
  category: Category;
}

/**
 * کارت دسته‌بندی: قاب تصویر با ارتفاع ثابت و object-contain است تا لوگوهای با
 * اندازه و نسبت متفاوت، همه یک‌اندازه و بدون بریدگی دیده شوند.
 */
export function CategoryCard({ category }: CategoryCardProps) {
  const imageSrc = category.image?.src;

  return (
    <Link
      href={`/products/category/${category.slug}`}
      aria-label={`مشاهده محصولات دسته ${category.name}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white
       shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg
       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
      <div
        className="flex h-28 w-full items-center justify-center overflow-hidden bg-gray-50 p-3
         transition-colors duration-300 group-hover:bg-orange-50/70 sm:h-36 sm:p-5"
      >
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={category.name}
            width={160}
            height={160}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
            className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
          />
        ) : (
          <HiOutlineViewGrid
            className="h-10 w-10 text-gray-300 sm:h-12 sm:w-12"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h2
          className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-gray-800
           transition-colors duration-300 group-hover:text-orange-500 sm:min-h-12 sm:text-base sm:leading-6"
        >
          {category.name}
        </h2>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-[11px] text-gray-500 sm:text-xs">
            {typeof category.count === "number"
              ? `${e2p(category.count)} محصول`
              : "مشاهده محصولات"}
          </span>

          <IoIosArrowBack
            className="h-4 w-4 shrink-0 text-gray-300 transition duration-300
             group-hover:-translate-x-1 group-hover:text-orange-500"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}
