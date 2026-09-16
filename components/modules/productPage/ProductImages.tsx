"use client";

import { Products } from "@/types/products";
import Image from "next/image";
import { useState } from "react";
import { HiDotsHorizontal } from "react-icons/hi";

interface ProductImagesProps {
  product: Products;
}

export default function ProductImages({ product }: ProductImagesProps) {
  const [productImage, setProductImage] = useState(
    product.images[0]?.src || "",
  );

  //   console.log(product);

  const changeImageHandler = (src: string) => {
    setProductImage(src);
  };
  return (
    <div className="flex w-full flex-col items-center rounded-lg md:border-l-2 md:border-dashed
     md:border-gray-300 p-2 sm:p-3 lg:w-md lg:max-w-md">
      <Image
        className="rounded-lg bg-gray-400 object-cover transition duration-300"
        src={productImage}
        alt={product?.name}
        width={350}
        height={350}
      />

      <div className="my-6 flex gap-2 transition-all duration-300 sm:gap-4 sm:my-12">
        {product?.images.map((item) => (
          <div
            onClick={() => changeImageHandler(item.src)}
            className={`cursor-pointer rounded-lg border border-2 border-gray-300 transition duration-300
                                 hover:border-gray-500
                                 ${productImage === item.src ? "border-orange-500" : ""}`}
            key={item.id}
          >
            <Image
              className="rounded-lg"
              src={item.src}
              alt={item.name}
              width={80}
              height={80}
            />
          </div>
        ))}

        <div className="relative rounded-lg">
          <div
            className="absolute flex h-full w-full items-center justify-center 
                    rounded-lg border border-2 border-gray-300 backdrop-blur-sm 
                    transition duration-300 hover:border-gray-500 cursor-pointer"
          >
            <HiDotsHorizontal
              size={40}
              color="white"
              className="sm:size-[50px]"
            />
          </div>
          <Image
            className="rounded-lg"
            src={product?.images[0].src}
            alt={product?.images[0].src}
            width={80}
            height={80}
          />
        </div>
      </div>
    </div>
  );
}
