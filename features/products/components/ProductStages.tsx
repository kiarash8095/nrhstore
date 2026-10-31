"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RatingSection } from "./RatingSection";
import type { Products } from "../types/product.types";

const stages = [
  { id: "product-description", name: "توضیحات" },
  { id: "product-specifications", name: "مشخصات" },
  { id: "product-reviews", name: "دیدگاه‌ها" },
] as const;

export function ProductStages({ product, description }: { product: Products; description: ReactNode }) {
  const [currentStage, setCurrentStage] = useState(0);
  const navigationRef = useRef<HTMLElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const offset = (navigationRef.current?.getBoundingClientRect().bottom ?? 0) + 24;
      let active = 0;
      sectionRefs.current.forEach((section, index) => {
        if (section && section.getBoundingClientRect().top <= offset) active = index;
      });
      setCurrentStage(active);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(scheduleUpdate);
    sectionRefs.current.forEach(section => { if (section) observer.observe(section); });
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  return (
    <div className="relative isolate mx-auto mb-8 w-[95%] pb-28 lg:pb-0" data-product-details>
      <nav
        ref={navigationRef}
        aria-label="اطلاعات محصول"
        className="sticky top-[var(--store-header-height)] z-20 grid grid-cols-3 border-b border-gray-200 bg-white"
      >
        {stages.map((stage, index) => (
          <a
            key={stage.id}
            href={`#${stage.id}`}
            aria-current={currentStage === index ? "location" : undefined}
            className={`relative flex min-h-12 items-center justify-center gap-1.5 px-2 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-500 ${currentStage === index ? "font-bold text-orange-700 after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:rounded-full after:bg-orange-600 sm:after:inset-x-8" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}
          >
            {stage.name}
          </a>
        ))}
      </nav>

      <div className="divide-y divide-gray-200 rounded-b-2xl border-x border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
        <section
          ref={element => { sectionRefs.current[0] = element; }}
          id="product-description"
          aria-labelledby="product-description-title"
          className="scroll-mt-[calc(var(--store-header-height)+4.5rem)] py-6 sm:py-8"
        >
          <h2 id="product-description-title" className="mb-4 text-base font-bold text-gray-900">دربارهٔ محصول</h2>
          {description}
        </section>

        <section
          ref={element => { sectionRefs.current[1] = element; }}
          id="product-specifications"
          aria-labelledby="product-specifications-title"
          className="scroll-mt-[calc(var(--store-header-height)+4.5rem)] py-6 sm:py-8"
        >
          <h2 id="product-specifications-title" className="mb-4 text-base font-bold text-gray-900">مشخصات فنی</h2>
          {product.attributes.length > 0 ? (
            <dl className="divide-y divide-gray-100 text-sm">
              {product.attributes.map(attribute => (
                <div key={attribute.id || attribute.name} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4 py-3.5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] sm:gap-6">
                  <dt className="break-words leading-7 text-gray-500">{attribute.name}</dt>
                  <dd className="min-w-0 break-words leading-7 text-gray-900">{attribute.terms.map(term => term.name).join("، ") || "—"}</dd>
                </div>
              ))}
            </dl>
          ) : <p className="text-sm leading-7 text-gray-500">مشخصات تکمیلی برای این محصول ثبت نشده است.</p>}
        </section>

        <section
          ref={element => { sectionRefs.current[2] = element; }}
          id="product-reviews"
          aria-label="دیدگاه‌های محصول"
          className="scroll-mt-[calc(var(--store-header-height)+4.5rem)] py-6 sm:py-8"
        >
          <RatingSection product={product} />
        </section>
      </div>
    </div>
  );
}
