import { connection } from "next/server";
import { Suspense } from "react";

import { JsonLd } from '@/components/common/JsonLd';
import { site } from '@/configs/site';
import { BannerSlider,BannersRow,HomeBannerGroup,HomeBannersProvider } from "@/features/banners";
import { readBannerDocument } from "@/features/banners/server";
import { CategoriesSkeleton } from "@/features/categories";
import { Categories } from "@/features/categories/server";
import { Accessories } from "@/features/home/components/Accessories";
import { EdariProducts } from "@/features/home/components/EdariProducts";
import { JanebiProducts } from "@/features/home/components/JanebiProducts";
import { Laptops } from "@/features/home/components/Laptops";
import { NetworkProducts } from "@/features/home/components/NetworkProducts";
import { ProductSectionSkeleton } from "@/features/products";
import { BlogSectionSkeleton } from '@/features/blog';
import { HomeBlogSection } from '@/features/blog/server';

/**
 * هر بخش با مرز Suspense خودش استریم می‌شود؛ پوسته‌ی صفحه فوراً نمایش داده می‌شود
 * و هر بخش پس از دریافت داده، جای اسکلتون خودش را می‌گیرد.
 */
export default async function Home() {
  await connection();
  const bannerDocument = await readBannerDocument();
  return (
    <HomeBannersProvider initialDocument={bannerDocument}>
    <div className="flex flex-col flex-1 items-center justify-center font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-[1440px] flex-col items-center justify-between px-2 bg-white dark:bg-black sm:items-start sm:px-3">
        <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Organization', '@id': `${site.url}/#organization`, name: site.name, url: site.url }} />
        {/* <h1 className="my-4 text-lg font-bold sm:text-2xl">فروشگاه اینترنتی نوین رایانه همدان</h1> */}
        <BannerSlider />

        <Suspense fallback={<CategoriesSkeleton />}>
          <Categories />
        </Suspense>

        <HomeBannerGroup group="connection" />

        <Suspense fallback={<ProductSectionSkeleton />}>
          <Laptops />
        </Suspense>

        <BannersRow />

        <Suspense fallback={<ProductSectionSkeleton />}>
            <EdariProducts />
        </Suspense>

        <HomeBannerGroup group="hardware" />

        <Suspense fallback={<ProductSectionSkeleton />}>
            <NetworkProducts />
        </Suspense>

        <HomeBannerGroup group="gaming" />

        <Suspense fallback={<ProductSectionSkeleton />}>
            <Accessories />
        </Suspense>

        <HomeBannerGroup group="printer" />

        <Suspense fallback={<ProductSectionSkeleton />}>
            <JanebiProducts />
        </Suspense>

        <Suspense fallback={<BlogSectionSkeleton />}>
          <HomeBlogSection />
        </Suspense>
      </main>
    </div>
    </HomeBannersProvider>
  );
}
