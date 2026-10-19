"use client";

import { e2p } from "@/utils/numbers";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { useHomeBanners } from "./HomeBannersProvider";
import { getBannerPresentation } from "../utils/banner-presentation";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

interface BannerSliderProps {
  autoplay?: boolean;
  interval?: number;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(notify: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerReducedMotion() {
  return true;
}

export function BannerSlider({
  autoplay = true,
  interval = 6000,
}: BannerSliderProps) {
  const sliders = useHomeBanners("slider");
  const reducedMotion = React.useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getServerReducedMotion,
  );
  const sectionRef = React.useRef<HTMLElement>(null);
  const inView = React.useRef(false);
  const pointerRotation = React.useRef(false);
  const [api, setApi] = React.useState<CarouselApi>();
  const [rotationChoice, setRotationChoice] = React.useState<boolean | null>(
    null,
  );
  const [hovered, setHovered] = React.useState(false);
  const rotationRequested =
    sliders.length > 1 &&
    (rotationChoice ?? (autoplay && reducedMotion === false));
  const stopRotation = React.useCallback(() => setRotationChoice(false), []);

  const subscribe = React.useCallback(
    (notify: () => void) => {
      api?.on("select", notify);
      api?.on("reInit", notify);
      return () => {
        api?.off("select", notify);
        api?.off("reInit", notify);
      };
    },
    [api],
  );
  const selected = React.useSyncExternalStore(
    subscribe,
    () => api?.selectedScrollSnap() ?? 0,
    () => 0,
  );

  React.useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      inView.current = entry.isIntersecting;
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, [sliders.length]);

  React.useEffect(() => {
    api?.on("pointerDown", stopRotation);
    return () => {
      api?.off("pointerDown", stopRotation);
    };
  }, [api, stopRotation]);

  React.useEffect(() => {
    if (!api || !rotationRequested || hovered || sliders.length < 2) return;
    const timer = window.setInterval(() => {
      if (inView.current && document.visibilityState === "visible")
        api.scrollNext();
    }, interval);
    return () => window.clearInterval(timer);
  }, [api, rotationRequested, hovered, interval, sliders.length, selected]);

  if (!sliders.length) return null;

  return (
    <section
      ref={sectionRef}
      className="my-5 w-full sm:my-6"
      dir="ltr"
      data-banner-section="slider"
    >
      <Carousel
        setApi={setApi}
        opts={{
          loop: sliders.length > 1,
          direction: "ltr",
          duration: reducedMotion ? 0 : 25,
        }}
        dir="ltr"
        className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)] sm:rounded-3xl"
        aria-label="ویترین نوین رایانه"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={stopRotation}
        onKeyDownCapture={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          stopRotation();
          if (event.key === "ArrowRight") api?.scrollNext();
          else api?.scrollPrev();
        }}
      >
        {sliders.length > 1 && (
          <button
            type="button"
            data-rotation-control
            onPointerDown={() => {
              pointerRotation.current = rotationRequested;
            }}
            onClick={(event) =>
              setRotationChoice(
                !(event.detail ? pointerRotation.current : rotationRequested),
              )
            }
            aria-label={
              rotationRequested
                ? "توقف نمایش خودکار بنرها"
                : "شروع نمایش خودکار بنرها"
            }
            title={
              rotationRequested ? "توقف نمایش خودکار" : "شروع نمایش خودکار"
            }
            className="absolute bottom-3 start-3 z-10 flex size-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-orange-300 hover:text-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 motion-reduce:transition-none"
          >
            {rotationRequested ? (
              <Pause className="size-4" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
          </button>
        )}
        <CarouselContent
          className="-ms-0"
          aria-live={rotationRequested ? "off" : "polite"}
          aria-atomic="false"
        >
          {sliders.map((slider, index) => {
            const presentation = getBannerPresentation(slider);
            return (
              <CarouselItem
                key={slider.id}
                className="ps-0"
                inert={index !== selected}
                aria-hidden={index !== selected}
                aria-roledescription="اسلاید"
                aria-label={e2p(index + 1) + " از " + e2p(sliders.length)}
              >
                <Link
                  href={presentation.href}
                  className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"
                  aria-label={presentation.title + "؛ مشاهده محصولات"}
                >
                  <div className="relative aspect-[4/1] overflow-hidden bg-gray-100">
                    <Image
                      src={slider.src}
                      alt={slider.title}
                      fill
                      sizes="(max-width: 1280px) 95vw, 1256px"
                      preload={index === 0}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
                    <div className="min-w-0">
                      <h2 className="text-base font-bold leading-8 text-gray-900 sm:text-xl">
                        {presentation.title}
                      </h2>
                      <p className="mt-1 text-xs leading-6 text-gray-500 sm:text-sm">
                        {presentation.description}
                      </p>
                    </div>
                    <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-3 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition-colors group-hover:bg-orange-700 motion-reduce:transition-none">
                      مشاهده محصولات
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {sliders.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex aspect-[4/1] items-center justify-between px-2 sm:px-4">
            <button
              type="button"
              onClick={() => {
                stopRotation();
                api?.scrollPrev();
              }}
              aria-label="اسلاید قبلی"
              className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/95 text-gray-800 shadow-lg backdrop-blur-sm transition hover:bg-orange-600 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 motion-reduce:transition-none sm:size-14"
            >
              <ChevronLeft className="size-6 sm:size-7" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                stopRotation();
                api?.scrollNext();
              }}
              aria-label="اسلاید بعدی"
              className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/95 text-gray-800 shadow-lg backdrop-blur-sm transition hover:bg-orange-600 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 motion-reduce:transition-none sm:size-14"
            >
              <ChevronRight className="size-6 sm:size-7" aria-hidden="true" />
            </button>
          </div>
        )}
        {sliders.length > 1 && (
          <div className="flex min-h-16 items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/70 py-3 pe-4 ps-16">
            <div
              className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="group"
              aria-label="انتخاب بنر"
            >
              <div className="flex w-max min-w-full items-center justify-center">
                {sliders.map((slider, index) => (
                  <button
                    key={slider.id}
                    type="button"
                    onClick={() => {
                      stopRotation();
                      if (index !== selected) api?.scrollTo(index);
                    }}
                    aria-label={"نمایش بنر " + e2p(index + 1)}
                    aria-disabled={index === selected}
                    data-banner-dot={index}
                    className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-orange-500 sm:w-10"
                  >
                    <span
                      className={
                        "h-1.5 rounded-full transition-[width,background-color] motion-reduce:transition-none " +
                        (index === selected
                          ? "w-6 bg-orange-600"
                          : "w-1.5 bg-gray-300")
                      }
                    />
                  </button>
                ))}
              </div>
            </div>
            <span
              data-banner-counter
              className="min-w-12 text-center text-xs tabular-nums text-gray-500"
            >
              {e2p(selected + 1)} / {e2p(sliders.length)}
            </span>
          </div>
        )}
      </Carousel>
    </section>
  );
}
