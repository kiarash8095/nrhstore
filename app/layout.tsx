import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { YekanBakh } from "@/lib/fonts";
import "./globals.css";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { cn } from "@/lib/utils";
import ReactQueryProvider from "@/providers/ReactQueryProvider";
import { getMainCategories, getSubCategories } from "@/services/categories";
import MobileMenu from "@/components/layout/mobileMenu";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/react-query";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "نوین رایانه همدان",
  icons: {
    icon: "/favicon.png",
  },
  description: "|",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const slugs = ["edari", "network", "printer", "hardware", "accessory"];
  const ids = [365, 55, 59, 57, 58];
  
  const queryClient = getQueryClient()
  const categories = await getMainCategories(ids, slugs);

  await queryClient.prefetchQuery({
    queryKey: ["sub-categories", ids],
    queryFn: () => getSubCategories(ids)
  })



  return (
    <html
      lang="fa"
      dir="rtl"
      className={cn(
        "h-full w-full",

        "antialiased",
        // geistSans.variable,
        // geistMono.variable,
        YekanBakh.variable,
        // "font-sans",
        // inter.variable,
      )}
    >
      <body className="min-h-full w-full flex flex-col overflow-x-hidden">
        <ReactQueryProvider>
          <HydrationBoundary state={dehydrate(queryClient)}>

          <Header categories={categories} />

          {children}
          <MobileMenu />
          <Footer />
          </HydrationBoundary>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
