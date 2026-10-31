import { Card,CardContent } from "@/components/ui/card";
import {
Carousel,
CarouselContent,
CarouselItem,
CarouselNext,
CarouselPrevious,
} from "@/components/ui/carousel";
import { getCategoriesWithId } from "@/features/categories/api/categories.api";
import { shortText } from "@/utils/text";
import Image from "next/image";
import Link from "next/link";
import { HiOutlineViewGrid } from "react-icons/hi";

export async function Categories() {
  // const slugs = [
  //   "edari",
  //   "network",
  //   "printer",
  //   "hardware",
  //   "accessory",
  //   "laptop",
  // ];
  const ids = [55, 85, 57, 58, 59, 215, 352];
  const data = await getCategoriesWithId(ids);
  // console.log(data);


  return (
    <div className="my-8 w-full sm:my-10">
      <div className="flex mb-7">
        <div className="flex items-center p-2 rounded-lg border">
          <HiOutlineViewGrid color="orange" size={30} />
        </div>
        <div className="flex flex-col items-start mr-3">
          <p className="text-2xl font-bold">دسته ها</p>
          <Link
            href="/categories"
            className="font-thin text-sm text-gray-500 transition hover:text-orange-500"
          >
            نمایش همه
          </Link>
        </div>
      </div>

      <Carousel
        className="w-full m-auto"
        opts={{
          direction: "rtl",
        }}
      >
        <CarouselContent>
          {data?.map((category) => {
            return (
              <CarouselItem
                key={category.id}
                className="basis-1/2 sm:basis-1/3 lg:basis-1/6"
              >
                <Link
                  href={`/products/category/${category.slug}`}
                  className="block h-full p-1"
                >
                  <Card className="h-44 gap-0 py-0 transition hover:-translate-y-1 hover:shadow-lg sm:h-48">
                    <CardContent className="flex h-full flex-col items-center justify-center gap-2 p-3 sm:p-4">
                      <Image
                        width={128}
                        height={128}
                        src={category?.image.src}
                        alt={`${category.name}`}
                        className="h-24 w-24 shrink-0 object-contain sm:h-28 sm:w-28"
                      />
                      <p className="line-clamp-2 h-10 shrink-0 content-center text-center text-sm font-medium leading-5">
                        {shortText(category?.name)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="-start-2 z-10 hidden size-10 sm:flex" aria-label="دسته‌های قبلی" />
        <CarouselNext className="-end-2 z-10 hidden size-10 sm:flex" aria-label="دسته‌های بعدی" />
      </Carousel>
    </div>
  );
}
