"use client";

import { AuthAccountButton } from "@/features/auth";
import { CartButton } from "@/features/cart";
import { CategoryMenu,type Category } from "@/features/categories";
import { SearchDialog,SearchField,SearchProvider } from "@/features/search";
import desktopLogo from "@/public/nrh-header-desktop.png";
import Image from "next/image";
import Link from "next/link";

const secondaryMenu = [
  { name: "فروشگاه", href: "/products" },
  { name: "بلاگ", href: "/blog" },
  { name: "سوالات متداول", href: "/qa" },
  { name: "تماس با ما", href: "/contact-us" },
];


export default function SiteHeader({ categories }: { categories: Category[] }) {
  return (
    <SearchProvider>
      <header
        className="sticky top-0 z-40 border-b border-gray-100
       bg-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-sm w-full"
      >
        <div
          className="mx-auto flex w-[90%] max-w-[1400px] items-center
         justify-between gap-3 py-3 lg:gap-5"
        >
          <div className="flex items-center gap-7 w-full">
            <div className="flex min-w-0 items-center justify-start">
              <Link
                href="/"
                className="block w-[130px] shrink-0 sm:w-[150px] lg:w-[180px]"
              >
                <Image
                  src={desktopLogo}
                  alt="لوگوی سایت"
                  loading="eager"
                  className="h-auto w-full object-contain"
                />
              </Link>
            </div>

            <SearchField />
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
            <div className="flex items-center gap-2 max-md:hidden">
              <AuthAccountButton />

              <CartButton />
            </div>
          </div>
        </div>

        <SearchDialog />
      </header>


      <nav className="mx-auto mt-4 w-[92%] max-w-[1400px]">
        <div className="flex items-center justify-start gap-3">
          <CategoryMenu categories={categories} />

          <div className="flex mr-10 max-md:hidden">
            <ul
              className="flex flex-wrap items-center justify-center gap-3
             text-sm text-gray-500 lg:gap-5"
            >
              {secondaryMenu.map((item) => (
                <li
                  key={item.name}
                  className="transition duration-300 hover:text-orange-500"
                >
                  <Link href={item.href}>{item.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </SearchProvider>
  );
}
