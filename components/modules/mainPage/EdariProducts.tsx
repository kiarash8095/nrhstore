import Image from "next/image";
import { shortText } from "@/utils/shortText";
import { FaStar } from "react-icons/fa";
import ToomaanIcon from "@/components/icons/ToomaanIcon";
import { sp } from "@/utils/numbers";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import PackageIcon from "@/components/icons/PackageIcon";
import PrinterIcon from "@/components/icons/PrinterIcon";
import { TiPrinter } from "react-icons/ti";
import { getSpecificProducts } from "@/services/getSpecificProducts";

export async function EdariProducts() {
  const products = await getSpecificProducts(57);

  // console.log(data);
  return (
    <div className="w-full my-15">
      <div className="flex mb-7">
        <div className="flex items-center p-2 rounded-lg border">
          <TiPrinter color="orange" size={35} />
        </div>
        <div className="flex flex-col gap-2 items-start mr-3">
          <p className="text-2xl font-bold">ماشین های اداری</p>
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
            <CarouselItem
              key={product.id}
              className="basis-[90%] scroll-fade sm:basis-1/2 lg:basis-1/3"
            >
              <div className="p-1">
                <Card
                  className="hover:shadow-lg border hover:border-orange-400 w-full transition-all duration-300
                             hover:-translate-y-1 cursor-pointer"
                >
                  <CardContent className="flex h-[430px] flex-col items-center justify-between p-2 sm:h-[450px]">
                    <Link
                      href={`/products/${product.slug}`}
                      className="group flex h-full w-full flex-col"
                    >
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
                      <div className="relative flex h-52 items-center justify-center p-3">
                        <Image
                          width={250}
                          height={250}
                          src={product?.images[0].src}
                          alt={`${product.name}`}
                          className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
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
    </div>
  );
}
