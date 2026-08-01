import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { YekanBakh } from "@/lib/fonts";
import "./globals.css";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { cn } from "@/lib/utils";
import ReactQueryProvider from "@/providers/ReactQueryProvider";
import { getMainCategories, getSubCategories } from "@/services/categories";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

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
  const categories = await getMainCategories(slugs, ids);
  // const subCategories = await getSubCategories(id)
  return (
    <html
      lang="fa"
      dir="rtl"
      className={cn(
        "h-full",
        "antialiased",
        // geistSans.variable,
        // geistMono.variable,
        YekanBakh.className,
        "font-sans",
        inter.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <ReactQueryProvider>
          <Header categories={categories} />

          {children}
          <Footer />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
