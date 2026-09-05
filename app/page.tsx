import { BannerSlider } from "@/components/modules/mainPage/BannerSlider";
import { BannersRow } from "@/components/modules/mainPage/BannersRow";
import { Categories } from "@/components/modules/mainPage/Categories";
import { EdariProducts } from "@/components/modules/mainPage/EdariProducts";
import { Laptops } from "@/components/modules/mainPage/Laptops";
import secondBanner from "@/public/Untitled-111.webp";
import hardwareBannerImage from "@/public/Layer-2.webp";
import hardwareBannerImage2 from "@/public/Layer-2-1.webp";
import gamingBanner from "@/public/کیس-گیمینگ-همدان.webp";
import printerBanner from "@/public/خرید_پرینتر_همدان.webp";
import Image from "next/image";
import { NetworkProducts } from "@/components/modules/mainPage/NetworkProducts";
import { Accessories } from "@/components/modules/mainPage/Accessories";
import { JanebiProducts } from "@/components/modules/mainPage/JanebiProducts";
import { SticksToFooter } from "@/components/modules/mainPage/SticksToFooter";
import { Suspense } from "react";
import { AccessoriesSkeleton } from "@/components/skeleton/AccessoriesSkeleton";
import { ProductsSkeleton } from "@/components/skeleton/ProductsSkeleton";
import { CategoriesSkeleton } from "@/components/skeleton/CategoriesSkeleton";
import { LazySection } from "@/components/common/LazySection";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-7xl flex-col items-center justify-between px-3 bg-white dark:bg-black sm:items-start">
        <BannerSlider />
        <Categories />

        <div className="mb-10 mt-5 w-full">
          <Image
            className="h-auto w-full object-cover"
            src={secondBanner}
            alt="بنر اتصال پایدار"
          />
        </div>

        <Laptops />

        <BannersRow />

        <LazySection fallback={<ProductsSkeleton />}>
          <EdariProducts />
        </LazySection>

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

        <LazySection fallback={<ProductsSkeleton />}>
          <NetworkProducts />
        </LazySection>

        <div>
          <Image src={gamingBanner} alt="عکس کیس گیمینگ" />
        </div>

        <LazySection fallback={<AccessoriesSkeleton />}>
          <Accessories />
        </LazySection>

        <div>
          <Image src={printerBanner} alt="خرید پرینتر همدان" />
        </div>

        <LazySection fallback={<ProductsSkeleton />}>
          <JanebiProducts />
        </LazySection>

        <SticksToFooter />
      </main>
    </div>
  );
}
