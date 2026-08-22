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
    <div className="flex flex-col items-center w-md max-w-md p-2 rounded-lg border-l-2 border-dashed border-gray-300">
        <Image
            className="bg-gray-400 rounded-lg transition duration-300 object-cover"
            src={productImage}
            alt={product?.name}
            width={350}
            height={350}
          />

        <div className="flex gap-4 transition-all duration-300 my-12">
          {product?.images.map((item) => (
            <div
              onClick={() => changeImageHandler(item.src)}
              className={`border border-2 border-gray-300 transition duration-300
                                 hover:border-gray-500
                                cursor-pointer rounded-lg
                                 ${productImage === item.src ? "border-orange-500" : ""}`}
              key={item.id}
            >
              <Image
                className="rounded-lg"
                src={item.src}
                alt={item.name}
                width={100}
                height={100}
              />
            </div>
          ))}

          <div className="relative rounded-lg">
            <div
              className="absolute rounded-lg flex items-center cursor-pointer 
                    justify-center backdrop-blur-sm h-inherit w-full h-full 
                    border border-2 border-gray-300 hover:border-gray-500"
            >
              <HiDotsHorizontal size={50} color="white" />
            </div>
            <Image
              className="rounded-lg"
              src={product?.images[0].src}
              alt={product?.images[0].src}
              width={100}
              height={100}
            />
          </div>
        </div>
      </div>
  );
}
