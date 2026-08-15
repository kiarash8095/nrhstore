import { TiPrinter } from "react-icons/ti";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductsSkeleton() {
  return (
    <div className="w-full my-15">
      {/* Section Header */}
      <div className="flex mb-7">
        <div className="flex items-center p-2 rounded-lg border">
          <TiPrinter color="orange" size={35} />
        </div>

        <div className="flex flex-col gap-2 items-start mr-3">
          {/* عنوان */}
          <Skeleton className="h-9 w-48 rounded-md" />

          {/* نمایش همه */}
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
      </div>

      {/* Products Carousel */}
      <Carousel
        opts={{
          align: "start",
          direction: "rtl",
        }}
        className="w-full"
      >
        <CarouselContent>
          {Array.from({ length: 3 }).map((_, index) => (
            <CarouselItem
              key={index}
              className="basis-1/3 scroll-fade"
            >
              <div className="p-1">
                <div
                  className="
                    border border-transparent
                    rounded-xl
                    w-full
                  "
                >
                  <div className="flex flex-col aspect-square items-center justify-between p-2">
                    
                    {/* Stock + Rating */}
                    <div className="flex w-full justify-between">
                      <Skeleton className="h-6 w-[70px] rounded-full" />

                      <Skeleton className="h-6 w-[50px] rounded-full" />
                    </div>

                    {/* Product Image */}
                    <div className="relative p-3">
                      <Skeleton className="w-[250px] h-[250px] rounded-lg" />
                    </div>

                    {/* Product Name */}
                    <div className="w-full space-y-2">
                      <Skeleton className="h-4 w-full rounded-md" />
                      <Skeleton className="h-4 w-2/3 rounded-md" />
                    </div>

                    {/* Price */}
                    <div className="mt-4 flex gap-2 w-full">
                      <Skeleton className="h-5 w-24 rounded-md" />
                    </div>

                    {/* Add to Cart */}
                    <Skeleton className="h-12 w-40 mt-5 rounded-xl" />
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