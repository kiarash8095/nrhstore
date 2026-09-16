import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { YekanBakh } from "@/lib/fonts";
import "./globals.css";
import Footer from "@/components/layout/footer";
import { cn } from "@/lib/utils";
import ReactQueryProvider from "@/providers/ReactQueryProvider";
import { HeaderWithCategories } from "@/components/layout/headerWithCategories";
import MobileMenu from "@/components/layout/mobileMenu";
import { PageTransition } from "@/components/animation/pageTransition";
import { HeaderSkeleton } from "@/components/skeleton";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "نوین رایانه همدان",
  icons: {
    icon: "/favicon.png?v=2",
    shortcut: "/favicon.png",
  },
  description: "|",
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
        "h-full w-full",
        "scroll-smooth",

        "antialiased",
        // geistSans.variable,
        // geistMono.variable,
        YekanBakh.variable,
        // "font-sans",
        // inter.variable,
      )}
    >
      <body className="min-h-full w-full  flex flex-col overflow-x-hidden bg-[#f7f8fa]">
        <ReactQueryProvider>
          {/* <HydrationBoundary state={dehydrate(queryClient)}> */}
          <PageTransition>
            {/* هدر داده‌محور است؛ با مرز Suspense جدا، پوسته‌ی سایت بدون انتظار برای دسته‌ها رندر می‌شود */}
            <Suspense fallback={<HeaderSkeleton />}>
              <HeaderWithCategories />
            </Suspense>

            {children}
            <MobileMenu />

            <Footer />
          </PageTransition>
          {/* </HydrationBoundary> */}
        </ReactQueryProvider>
      </body>
    </html>
  );
}
