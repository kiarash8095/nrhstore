import { Suspense } from "react";
import Image from "next/image";

import { BannersRow } from "@/components/modules/mainPage/BannersRow";
import { Categories } from "@/components/modules/mainPage/Categories";
import { EdariProducts } from "@/components/modules/mainPage/EdariProducts";
import { Laptops } from "@/components/modules/mainPage/Laptops";
import secondBanner from "@/public/Untitled-111.webp";
import hardwareBannerImage from "@/public/Layer-2.webp";
import hardwareBannerImage2 from "@/public/Layer-2-1.webp";
import gamingBanner from "@/public/کیس-گیمینگ-همدان.webp";
import printerBanner from "@/public/خرید_پرینتر_همدان.webp";
import { NetworkProducts } from "@/components/modules/mainPage/NetworkProducts";
import { Accessories } from "@/components/modules/mainPage/Accessories";
import { JanebiProducts } from "@/components/modules/mainPage/JanebiProducts";
import {
  CategoriesSkeleton,
  ProductSectionSkeleton,
} from "@/components/skeleton";
import { LazySection } from "@/components/common/LazySection";
import { BannerSlider } from "@/components/modules/mainPage/BannerSlider";

/**
 * هر بخش با مرز Suspense خودش استریم می‌شود؛ پوسته‌ی صفحه فوراً نمایش داده می‌شود
 * و هر بخش پس از دریافت داده، جای اسکلتون خودش را می‌گیرد.
 */
export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-7xl flex-col items-center justify-between px-3 bg-white dark:bg-black sm:items-start">
        <BannerSlider />

        <Suspense fallback={<CategoriesSkeleton />}>
          <Categories />
        </Suspense>

        <div className="mb-10 mt-5 w-full">
          <Image
            className="h-auto w-full object-cover"
            src={secondBanner}
            alt="بنر اتصال پایدار"
          />
        </div>

        <Suspense fallback={<ProductSectionSkeleton />}>
          <Laptops />
        </Suspense>

        <BannersRow />

        <Suspense fallback={<ProductSectionSkeleton />}>
          <LazySection fallback={<ProductSectionSkeleton />}>
            <EdariProducts />
          </LazySection>
        </Suspense>

        <div className="flex gap-3">
          <div>
            <Image
              className="rounded-2xl"
              src={hardwareBannerImage}
              alt="عکس تجهیزات"
            />
          </div>
          <div>
            <Image
              className="rounded-2xl"
              src={hardwareBannerImage2}
              alt="عکس تجهیزات 2"
            />
          </div>
        </div>

        <Suspense fallback={<ProductSectionSkeleton />}>
          <LazySection fallback={<ProductSectionSkeleton />}>
            <NetworkProducts />
          </LazySection>
        </Suspense>

        <div>
          <Image src={gamingBanner} alt="عکس کیس گیمینگ" />
        </div>

        <Suspense fallback={<ProductSectionSkeleton />}>
          <LazySection fallback={<ProductSectionSkeleton />}>
            <Accessories />
          </LazySection>
        </Suspense>

        <div>
          <Image src={printerBanner} alt="خرید پرینتر همدان" />
        </div>

        <Suspense fallback={<ProductSectionSkeleton />}>
          <LazySection fallback={<ProductSectionSkeleton />}>
            <JanebiProducts />
          </LazySection>
        </Suspense>
      </main>
    </div>
  );
}
