"use client";

import Image from "next/image";
import * as React from "react";
import { e2p } from "@/utils/numbers";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

export interface Slider {
  name: string;
  cover: string;
}

export const sliders: Slider[] = [
  { name: "بنر ۱", cover: "/Untitled-1-2.webp" },
  { name: "بنر ۲", cover: "/Untitled-11.webp" },
  { name: "بنر ۳", cover: "/slider1-5.webp" },
  { name: "بنر ۴", cover: "/slider4.webp" },
];

interface BannerSliderProps {
  autoplay?: boolean;
  interval?: number;
}

export function BannerSlider({
  autoplay = true,
  interval = 3000,
}: BannerSliderProps) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [isPaused, setIsPaused] = React.useState(false);
  const [count, setCount] = React.useState(0)
  const [current, setCurrent] = React.useState(0)

  React.useEffect(() => {
    if (!api || !autoplay || isPaused) return;

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap() + 1)

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });

    const timer = window.setInterval(() => {
      api.scrollNext();
    }, interval);

    return () => window.clearInterval(timer);
  }, [api, autoplay, interval, isPaused]);

  return (
    <div
      className="mx-auto my-5 w-full max-w-6xl"
      dir="rtl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <Carousel
        setApi={setApi}
        opts={{ loop: true, direction: "ltr" }}
        dir="ltr"
        className="mx-auto w-[95%] sm:w-full"
        aria-label="بنرهای فروشگاه"
      >
        <CarouselContent className="-ms-0">
          {sliders.map((slider, index) => (
            <CarouselItem key={slider.name} className="ps-0">
              <Card className="overflow-hidden rounded-2xl border-0 bg-gray-100 py-0 shadow-2xl sm:rounded-3xl">
                <CardContent className="relative aspect-[16/5] p-0">
                  <Image
                    src={slider.cover}
                    alt={slider.name}
                    fill
                    sizes="(max-width: 640px) 95vw, (max-width: 1280px) 95vw, 1152px"
                    priority={index === 0}
                    className=""
                  />

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-5 pt-16 sm:p-6 sm:pt-20">
                    <h2 className="text-right text-xl font-bold text-white drop-shadow-lg md:text-2xl">
                      {slider.name}
                    </h2>
                  </div>

                  <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-sm text-white backdrop-blur-sm">
                    {index + 1} / {sliders.length}
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselNext
          className="right-3 left-auto rotate-180 border-white/20 bg-black/60 text-white hover:bg-black/80 hover:text-white sm:right-4"
          aria-label="اسلاید بعدی"
        />
        <CarouselPrevious
          className="left-3 right-auto rotate-180 border-white/20 bg-black/60 text-white hover:bg-black/80 hover:text-white sm:left-4"
          aria-label="اسلاید قبلی"
        />
      </Carousel>
      <div className="py-2 text-center text-sm text-muted-foreground">
        اسلاید {e2p(current)} از {e2p(count)}
      </div>
    </div>
  );
}
