"use client";

import { Products } from "@/types/products-types";
import Image from "next/image";
import { useState } from "react";
import { HiDotsHorizontal } from "react-icons/hi";

import { cn } from "@/lib/utils";
import { ProductGalleryDialog } from "./ProductGalleryDialog";

interface ProductImagesProps {
  product: Products;
}

export default function ProductImages({ product }: ProductImagesProps) {
  const images = product?.images ?? [];
  const [productImage, setProductImage] = useState(images[0]?.src || "");

  const changeImageHandler = (src: string) => {
    setProductImage(src);
  };

  return (
    <div
      className="flex w-full flex-col items-center rounded-lg md:border-l-2 md:border-dashed
     md:border-gray-300 p-2 sm:p-3 lg:w-md lg:max-w-md"
    >
      <Image
        className="rounded-lg bg-gray-400 object-cover transition duration-300"
        src={productImage}
        alt={product?.name}
        width={350}
        height={350}
      />

      <div className="my-6 flex flex-wrap items-center justify-center gap-2 transition-all duration-300 sm:my-12 sm:gap-3">
        {images.map((item) => {
          const isActive = productImage === item.src;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => changeImageHandler(item.src)}
              aria-label={`نمایش تصویر ${item.name || product.name}`}
              aria-pressed={isActive}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition duration-300 sm:h-20 sm:w-20",
                "focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none",
                isActive
                  ? "border-orange-500 shadow-sm"
                  : "border-gray-300 hover:border-gray-500",
              )}
            >
              <Image
                src={item.src}
                alt=""
                fill
                sizes="80px"
                className="object-contain p-1.5"
              />
            </button>
          );
        })}

        {images.length > 1 && (
          <ProductGalleryDialog
            images={images}
            productName={product.name}
            activeSrc={productImage}
            onSelect={changeImageHandler}
            trigger={
              <button
                type="button"
                aria-label="نمایش گالری تصاویر"
                className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 border-gray-300 bg-white transition duration-300 hover:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none sm:h-20 sm:w-20"
              >
                <Image
                  src={images[0].src}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-contain p-1.5 opacity-70"
                />
                <span
                  className="absolute inset-0 bg-gray-900/45 backdrop-blur-[1px] transition duration-300 group-hover:bg-gray-900/60"
                  aria-hidden="true"
                />
                <span className="absolute inset-0 flex items-center justify-center text-white">
                  <HiDotsHorizontal className="size-7" aria-hidden="true" />
                </span>
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
