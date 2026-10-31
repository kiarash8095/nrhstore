"use client";

import { e2p } from "@/utils/numbers";
import {
  ArrowLeft,
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
const IMAGE_HEIGHT = "h-[clamp(240px,38vw,480px)] lg:aspect-[4/1] lg:h-auto";

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
            className="absolute start-3 top-3 z-10 flex size-11 items-center justify-center rounded-full border border-white/70 bg-white/90 text-gray-700 backdrop-blur-sm transition hover:text-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 motion-reduce:transition-none"
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
                  <div className={`relative overflow-hidden bg-gray-100 ${IMAGE_HEIGHT}`}>
                    <Image
                      src={slider.src}
                      alt={slider.title}
                      fill
                      sizes="(max-width: 1440px) 100vw, 1416px"
                      preload={index === 0}
                      className="object-cover object-center"
                    />
                  </div>
                  <div dir="rtl" className="flex min-h-12 items-center justify-between gap-3 px-3 py-2 sm:px-5">
                    <div className="min-w-0">
                      <h2 className="truncate text-xs font-semibold leading-6 text-gray-800 sm:text-sm">
                        {presentation.title}
                      </h2>
                    </div>
                    <span className="inline-flex shrink-0 items-center justify-center gap-1.5 text-[11px] font-semibold text-orange-700 transition-colors group-hover:text-orange-800 motion-reduce:transition-none sm:text-xs">
                      مشاهده
                      <ArrowLeft className="size-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {sliders.length > 1 && (
          <div className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-2 sm:px-4 ${IMAGE_HEIGHT}`}>
            <button
              type="button"
              onClick={() => {
                stopRotation();
                api?.scrollPrev();
              }}
              aria-label="اسلاید قبلی"
              className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/90 text-gray-800 shadow-sm backdrop-blur-sm transition hover:bg-orange-600 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 motion-reduce:transition-none sm:size-12"
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
              className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/90 text-gray-800 shadow-sm backdrop-blur-sm transition hover:bg-orange-600 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 motion-reduce:transition-none sm:size-12"
            >
              <ChevronRight className="size-6 sm:size-7" aria-hidden="true" />
            </button>
          </div>
        )}
        {sliders.length > 1 && (
          <div className={`pointer-events-none absolute inset-x-0 top-0 flex items-end justify-center gap-1 px-14 pb-3 ${IMAGE_HEIGHT}`}>
            <div
              className="pointer-events-auto min-w-0 max-w-full overflow-x-auto rounded-full bg-white/90 px-1 shadow-sm backdrop-blur-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                    className="flex h-11 w-8 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-500 sm:w-10"
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
              className="sr-only"
            >
              {e2p(selected + 1)} / {e2p(sliders.length)}
            </span>
          </div>
        )}
      </Carousel>
    </section>
  );
}
