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
      <div className="mb-3 flex items-center gap-2 px-1">
        <Sparkles className="size-4 text-orange-600" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-gray-800">برای میز کار و دنیای دیجیتال شما</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {banners.map((banner) => (
          <BannerCard key={banner.id} banner={banner} compact sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1440px) 33vw, 460px" />
        ))}
      </div>
    </section>
  );
}
