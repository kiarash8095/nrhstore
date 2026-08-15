import { HiOutlineViewGrid } from "react-icons/hi";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

export function CategoriesSkeleton() {
  return (
    <div className="w-full my-15">
      {/* Header */}
      <div className="flex mb-7">
        <div className="flex items-center p-2 rounded-lg border">
          <HiOutlineViewGrid color="orange" size={30} />
        </div>

        <div className="flex flex-col items-start gap-2 mr-3">
          {/* عنوان */}
          <Skeleton className="h-9 w-28 rounded-md" />

          {/* نمایش همه */}
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
      </div>

      {/* Categories */}
      <Carousel
        className="w-full m-auto"
        opts={{
          direction: "rtl",
        }}
      >
        <CarouselContent>
          {Array.from({ length: 6 }).map((_, index) => (
            <CarouselItem
              key={index}
              className="basis-1/3"
            >
              <div className="p-1">
                <div className="border rounded-xl">
                  <div
                    className="
                      flex flex-col
                      aspect-square
                      items-center
                      justify-center
                      p-6
                      gap-4
                    "
                  >
                    {/* Category Image */}
                    <Skeleton className="w-[80px] h-[80px] rounded-full" />

                    {/* Category Name */}
                    <Skeleton className="h-5 w-24 rounded-md" />
                  </div>
                </div>
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