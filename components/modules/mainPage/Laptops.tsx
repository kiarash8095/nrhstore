import { IoIosLaptop } from "react-icons/io";
import { FaStar } from "react-icons/fa6";

import Image from "next/image";
import { shortText } from "@/utils/shortText";
import Link from "next/link";
import PackageIcon from "@/components/icons/PackageIcon";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import ToomaanIcon from "@/components/icons/ToomaanIcon";
import { sp } from "@/utils/numbers";
import { getSpecificProducts } from "@/services/getSpecificProducts";


export async function Laptops() {

  const products = await getSpecificProducts(55)
  return (
    <div className="my-10 w-full">
      <div className="flex mb-7">
                <div className="flex items-center p-2 rounded-lg border">

                    <IoIosLaptop color="orange" size={30}/>
                </div>
                <div className="flex flex-col items-start mr-3">
                    <p className="text-2xl font-bold">لپ تاپ ها</p>
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
                <Card className="hover:shadow-lg border hover:border-orange-400 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                  <CardContent className="flex flex-col aspect-square items-center justify-between p-2">
                    <Link href={`/products/${product.slug}`} className="group ">
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

      {/* <Carousel opts={{align: "start"}} className="w-full">

                <CarouselContent>
                    {data?.map(product => {

                        return(<Link href={`/products/product/${product.slug}`} key={product.id}>
                            <CarouselItem className="basis-1/2 lg:basis-1/3">
                                <div className="p-1">
                                    <Card>
                                        <CardContent className="flex flex-col aspect-square items-center justify-center
                                         p-6">
                                            <div className="flex w-full justify-between">

                                                <div className="flex gap-1 items-center justify-center pr-2 pl-2
                                                inset-shadow-orange-200 w-[70px] rounded-full">
                                                    <PackageIcon/>
                                                    <p className="text-xs">{product.is_in_stock ? "موجود" : "ناموجود"}</p>
                                                </div>

                                                <div className="flex gap-1 items-center justify-center pr-2 pl-2
                                                shadow-gray-400 w-[50px] rounded-full">
                                                    <span>{product.review_count}</span>
                                                    <FaStar color="orange"/>

                                                </div>
                                            </div>
                                            <Image width={80} height={80} src={product?.images[0].src} alt={`${product.name}`}/>
                                            <p className="w-full">{shortText(product?.name)}</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CarouselItem>
                        </Link>)
                    })}
                </CarouselContent>
                <CarouselPrevious/>
                <CarouselNext/>
            </Carousel> */}

      {/* <div ref={scrollRef} className="flex overflow-x-auto touch-pan-x
            select-none cursor-grab scrollbar-none scroll-fade gap-10">
                {data?.map(product => {
                    // console.log(product?.images[0].src);
                    return(<Link href={`/products/${product.slug}`} draggable={false} key={product.id}>
                    <div className="relative flex flex-col items-center gap-2 w-[200px] p-2
                    border border-1 border-orange-400 rounded-2xl h-auto">
                        <div className="flex w-full justify-between">

                            <div className="flex gap-1 items-center justify-center pr-2 pl-2
                         inset-shadow-orange-200 w-[70px] rounded-full">
                                <PackageIcon/>
                                <p className="text-xs">{product.is_in_stock ? "موجود" : "ناموجود"}</p>
                            </div>

                        <div className="flex gap-1 items-center justify-center pr-2 pl-2
                         shadow-gray-400 w-[50px] rounded-full">
                            <span>{product.review_count}</span>
                            <FaStar color="orange"/>

                        </div>
                    </div>
                        <Image src={product?.images[0].src} alt={`عکس دسته بندی ${product.name}`}
                         width={90} height={90}
                         />
                         <p>{shortText(product?.name)}</p>
                         <button className="px-6 py-2 mt-3 rounded-xl
                          bg-black text-white text-sm">افزودن به سبد خرید</button>
                    </div></Link>)
                })}
            </div> */}
    </div>
  );
}
