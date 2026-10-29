import { PageTransition } from "@/components/common/PageTransition";
import Footer from "@/components/layout/SiteFooter";
import { HeaderSkeleton } from "@/components/layout/HeaderSkeleton";
import { StoreHeader } from "@/components/layout/StoreHeader";
import { StoreOnly } from '@/components/layout/StoreOnly';
import MobileMenu from "@/components/layout/MobileNavigation";
import { YekanBakh } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { AppProviders } from "@/providers/AppProviders";
import type { Metadata } from "next";
import { Suspense } from "react";
import "../styles/globals.css";
import { site } from '@/configs/site';

// const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s | ${site.name}` },
  // آیکون‌ها به‌صورت خودکار از فایل‌های app/icon.png و app/apple-icon.png خوانده می‌شوند
  description: site.description,
  robots: { index: process.env.SITE_INDEXING_ENABLED === 'true', follow: true },
  openGraph: { type: 'website', locale: 'fa_IR', siteName: site.name, title: site.name, description: site.description,
    images: [{ url: '/nrh-header-desktop.png', alt: site.name }] },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={cn(
        "min-h-full w-full",
        "scroll-smooth",

        "antialiased",
        // geistSans.variable,
        // geistMono.variable,
        YekanBakh.variable,
        // "font-sans",
        // inter.variable,
      )}
    >
      <body className="flex min-h-dvh w-full flex-col overflow-x-hidden bg-[#f7f8fa]">
        <AppProviders>
          {/* AuthProvider چرخه‌ی حیات نشست را مدیریت می‌کند و مودال ورود را یک‌بار رندر می‌کند */}
            {/* <HydrationBoundary state={dehydrate(queryClient)}> */}
              {/* هدر داده‌محور است؛ با مرز Suspense جدا، پوسته‌ی سایت بدون انتظار برای دسته‌ها رندر می‌شود */}
              <StoreOnly><Suspense fallback={<HeaderSkeleton />}>
                <StoreHeader />
              </Suspense></StoreOnly>

              <PageTransition>{children}</PageTransition>
              <StoreOnly><MobileMenu /></StoreOnly>

              <StoreOnly><Footer /></StoreOnly>
            {/* </HydrationBoundary> */}
        </AppProviders>
      </body>
    </html>
  );
}
