"use client";

import { Sparkles } from "lucide-react";
import { BannerCard } from "./BannerCard";
import { useHomeBanners } from "./HomeBannersProvider";

export function BannersRow() {
  const banners = useHomeBanners("featured");
  if (!banners.length) return null;
  return (
    <section
      className="my-8 w-full sm:my-10"
      aria-label="انتخاب‌های کاربردی برای شما"
      data-banner-section="featured"
    >
      <div className="mb-4 flex items-center gap-3 px-1">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Sparkles className="size-4" aria-hidden="true" /></span>
        <div><p className="text-base font-bold text-gray-800">برای میز کار و دنیای دیجیتال شما</p><p className="mt-1 text-xs leading-6 text-gray-500">چند انتخاب کاربردی، برای استفاده هر روز</p></div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {banners.map((banner) => (
          <BannerCard key={banner.id} banner={banner} compact sizes="(max-width: 639px) 95vw, (max-width: 1023px) 47vw, (max-width: 1280px) 31vw, 410px" />
        ))}
      </div>
    </section>
  );
}
