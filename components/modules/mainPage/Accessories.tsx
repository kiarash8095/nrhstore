import { BsMouse3 } from "react-icons/bs";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Link from "next/link";
import { sp } from "@/utils/numbers";
import ToomaanIcon from "@/components/icons/ToomaanIcon";
import { FaStar } from "react-icons/fa";
import PackageIcon from "@/components/icons/PackageIcon";
import { shortText } from "@/utils/shortText";
import { getSpecificProducts } from "@/services/getSpecificProducts";

export async function Accessories() {
  const [mouse, keyboard] = await Promise.all([
    getSpecificProducts(60),
    getSpecificProducts(61),
  ]);

  const products = [...mouse, ...keyboard];

  // console.log(data);
  return (
    <div className="w-full my-15">
      <div className="flex mb-7">
        <div className="flex items-center p-2 rounded-lg border">
          <BsMouse3 color="orange" size={35} />
        </div>
        <div className="flex flex-col gap-2 items-start mr-3">
          <p className="text-2xl font-bold">موس و کیبورد</p>
          <span className="font-thin text-sm text-gray-500">نمایش همه</span>
        </div>
      </div>

      <Carousel
        opts={{
          align: "start",
          direction: "rtl",
        }}
        className="w-full"
      >
        <CarouselContent>
          {products?.map((product) => (
            <CarouselItem key={product.id} className="basis-1/3 scroll-fade">
              <div className="p-1">
                <Card
                  className="hover:shadow-lg border hover:border-orange-400 w-full transition-all duration-300
                             hover:-translate-y-1 cursor-pointer"
                >
                  <CardContent className="flex flex-col aspect-square items-center justify-between p-2">
                    <Link href={`/products/${product.slug}`} className="group">
                      <div className="flex w-full justify-between">
                        <div
                          className="flex gap-1 items-center justify-center pr-2 pl-2
                                        inset-shadow-orange-200 w-[70px] rounded-full"
                        >
                          <PackageIcon />
                          <p className="text-xs">
                            {product.is_in_stock ? "موجود" : "ناموجود"}
                          </p>
                        </div>

                        <div
                          className="flex gap-1 items-center justify-center pr-2 pl-2
                                                            shadow-gray-400 w-[50px] rounded-full"
                        >
                          <span>{product.review_count}</span>
                          <FaStar color="orange" />
                        </div>
                      </div>
                      <div className="relative p-3">
                        <Image
                          width={250}
                          height={250}
                          src={product?.images[0].src}
                          alt={`${product.name}`}
                          className="object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>

                      <p className="w-full hover:text-orange-500 ">
                        {shortText(product?.name)}
                      </p>

                      <div className="mt-4 flex gap-1">
                        <span>{sp(product?.prices.price)}</span>
                        <span>
                          <ToomaanIcon />
                        </span>
                      </div>
                      <button
                        className="flex px-10 py-3 mt-5 transition duration-300 cursor-pointer
                                 rounded-xl bg-black text-white text-sm hover:bg-orange-500"
                      >
                        افزودن به سبد خرید
                      </button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>

      {/* <div className="flex overflow-x-scroll scrollbar-none scroll-fade gap-10">
                {data?.map(product => {
                    // console.log(product?.images[0].src);
                    return(<div key={product.id} className="flex flex-col items-center gap-2 ">
                        <Image src={product?.images[0].src} width={90} height={90}
                         alt={`عکس دسته بندی ${product.name}`}/>
                         <p>{product?.name}</p>
                         <button>افزودن به سبد خرید</button>
                    </div>)
                })}
            </div> */}
    </div>
  );
}
