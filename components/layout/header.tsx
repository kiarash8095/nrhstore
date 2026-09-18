"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { RxHamburgerMenu } from "react-icons/rx";
import { IoIosArrowBack } from "react-icons/io";
import { IoGridOutline } from "react-icons/io5";

import { IoClose } from "react-icons/io5";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { getSearchResult } from "@/services/searchInputHeader";
import { useDebounce } from "@/hooks/useDebounce";
import { Category, SubCategory } from "@/types/category-types";
import { SearchResult } from "@/types/search-result-types";
import { getSubCategories } from "@/services/categories";
import { sp } from "@/utils/numbers";
import { MainMenuSkeleton, SearchResultsSkeleton } from "../skeleton";
import { Spinner } from "../common/Spinner";
import userRound from "@/public/user-round.svg";
import handBag from "@/public/handbag.svg";
import desktopLogo from "@/public/nrh-header-desktop.png";
import NetworkIcon from "../icons/NetworkIcon";
import ComputerIcon from "../icons/ComputerIcon";
import LaptopIcon from "../icons/LaptopIcon";
import AccessoryIcon from "../icons/AccessoryIcon";
import PrinterIcon from "../icons/PrinterIcon";

interface HeaderProps {
  categories: Category[];
}

const secondaryMenu = [
  { name: "فروشگاه", href: "/products" },
  { name: "بلاگ", href: "/blog" },
  { name: "سوالات متداول", href: "/qa" },
  { name: "تماس با ما", href: "/contact-us" },
];

const categoriesIcons = [
  { name: "laptop", id: 55, icon: LaptopIcon },
  { name: "hardware", id: 365, icon: ComputerIcon },
  { name: "edari", id: 57, icon: PrinterIcon },
  { name: "network", id: 58, icon: NetworkIcon },
  { name: "accessory", id: 59, icon: AccessoryIcon },
];

export default function Header({ categories }: HeaderProps) {
  const [input, setInput] = useState("");
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<Category | null>(null);

  // ترتیب نمایش دسته‌ها مطابق categoriesIcons؛ چون API ترتیب include را تضمین نمی‌کند
  const sortedCategories = [...(categories ?? [])].sort(
    (a, b) =>
      categoriesIcons.findIndex((c) => c.id === a.id) -
      categoriesIcons.findIndex((c) => c.id === b.id),
  );
  const activeCategory = hoveredCategory ?? sortedCategories[0] ?? null;

  const debouncedInput = useDebounce(input, 500);
  const queryClient = useQueryClient();
  console.log(categories);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const closeSearch = () => setIsInputOpen(false);

  useEffect(() => {
    if (!isInputOpen || !window.matchMedia("(max-width: 639px)").matches) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isInputOpen]);

  const handleMouseEnter = (category: Category) => {
    setHoveredCategory(category);
    queryClient.prefetchQuery({
      queryKey: ["sub-category", category?.id],
      queryFn: () => getSubCategories(category.id),
      staleTime: 1000 * 60 * 10,
    });
  };

  const {
    data: subCategoryData = [],
    isPending,
    isFetching,
  } = useQuery<SubCategory[]>({
    queryKey: ["sub-category", activeCategory?.id],
    queryFn: () => getSubCategories(activeCategory!.id),
    enabled: !!activeCategory?.id,
    staleTime: 1000 * 60 * 10,
  });

  const {
    data: searchData = [],
    isPending: searchLoading,
    isFetching: searchFetching,
  } = useQuery<SearchResult[]>({
    queryKey: ["get-search-result", debouncedInput],
    queryFn: () => getSearchResult(debouncedInput),
    enabled: debouncedInput.trim().length > 0,
    staleTime: 60 * 1000,
  });

  // وقتی نتایج قبلی روی صفحه است و درخواست جدید در راه است، به‌جای اسکلتون اسپینر نشان می‌دهیم
  const isSearchRefreshing = searchFetching && !searchLoading;

  return (
    <>
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

            <div className="relative w-full max-w-[520px] flex-1 ">
              <Input
                type="text"
                value={input}
                onChange={handleSearchInput}
                onFocus={() => setIsInputOpen(true)}
                placeholder="دنبال چی هستی؟"
                className="h-13 w-full rounded-xl font-light border
                 border-gray-200 bg-[#f7f7f7] pr-12 pl-11 text-sm shadow-sm
                  transition focus:border-orange-400 focus:bg-white"
              />

              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute left-2 top-1/2 h-9 w-9 -translate-y-1/2
                 rounded-full bg-gray-200 text-gray-700 hover:bg-orange-500 hover:text-white"
              >
                <SearchIcon className="h-4 w-4" />
              </Button>

              {input.trim() && (
                <button
                  type="button"
                  onClick={() => setInput("")}
                  className="absolute left-12 top-1/2 flex h-7 w-7
                   -translate-y-1/2 items-center justify-center rounded-full
                    text-gray-500 transition hover:bg-gray-200 hover:text-gray-800"
                  aria-label="پاک کردن جستجو"
                >
                  <IoClose className="h-4 w-4" />
                </button>
              )}

              <div
                className={`absolute left-0 right-0 top-full z-50 mt-2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-xl transition-all duration-200 ${
                  isInputOpen && debouncedInput.trim().length > 0
                    ? "visible opacity-100 translate-y-0"
                    : "invisible opacity-0 -translate-y-1 pointer-events-none"
                }`}
              >
                {searchLoading ? (
                  <SearchResultsSkeleton />
                ) : searchData.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-gray-500">
                    نتیجه‌ای پیدا نشد.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {isSearchRefreshing && (
                      <div className="flex items-center justify-center gap-2 py-1 text-[11px] text-gray-400">
                        <Spinner size="sm" label="به‌روزرسانی نتایج جستجو" />
                        <span>به‌روزرسانی نتایج…</span>
                      </div>
                    )}
                    {searchData.map((item) => (
                      <Link
                        href={item.permalink}
                        key={item.id}
                        onClick={closeSearch}
                        className="flex items-center gap-3 rounded-2xl border-b border-gray-100 p-2 transition hover:bg-orange-50"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                          <img
                            className="h-full w-full object-cover"
                            src={item.images[0]?.src || "/placeholder.png"}
                            alt={item.name}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-gray-700">
                            {item.name}
                          </p>
                          <span className="mt-1 block text-xs font-bold text-orange-500">
                            {sp(item?.prices.price)} تومان
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
            <div className="flex items-center gap-2 max-md:hidden">
              <div className="relative group">
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center
                 rounded-full border border-gray-200 bg-white cursor-pointer
                  shadow-sm transition hover:border-orange-500 hover:shadow-md"
                  aria-label="حساب کاربری"
                >
                  <Image
                    className="h-5 w-5"
                    src={userRound}
                    alt="لوگوی کاربری"
                  />
                </button>

                {/* <div className="invisible absolute left-1/2 top-full z-30 mt-2 w-40 h-fit -translate-x-1/2 rounded-xl border border-gray-100 bg-white p-3 text-xs text-gray-700 opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0">
                  <p className="font-bold text-gray-800">حساب کاربری</p>
                  <Link href="#" className="mt-4 text-gray-800 text-md p-2"> ورود به حساب کاربری</Link>
                </div> */}
              </div>

              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="relative flex h-11 w-11 items-center justify-center
                   rounded-full border border-gray-200 bg-white shadow-sm cursor-pointer
                    transition hover:border-orange-500 hover:shadow-md"
                  aria-label="سبد خرید"
                >
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1a1a1a] px-1 text-[9px] font-bold text-white">
                    2
                  </span>
                  <Image
                    className="h-5 w-5"
                    src={handBag}
                    alt="لوگوی سبد خرید"
                  />
                </button>

                <div className="invisible absolute left-1/2 top-full z-30 mt-2 w-40 -translate-x-1/2 rounded-xl border border-gray-100 bg-white p-3 text-xs text-gray-700 opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0">
                  <p className="font-bold text-gray-800">سبد خرید</p>
                  <p className="mt-2 text-gray-500">تسویه سبد خرید</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isInputOpen && (
          <div
            className="fixed inset-0 z-[9999] flex h-dvh min-h-0 flex-col bg-[#fffaf5] sm:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="جستجوی محصولات"
            onKeyDown={(event) => {
              if (event.key === "Escape") closeSearch();
            }}
          >
            <div className="shrink-0 border-b border-orange-100 bg-white px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-800">
                  جستجوی محصول
                </h2>
                <button
                  type="button"
                  onClick={closeSearch}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-orange-100 hover:text-orange-600"
                  aria-label="بستن جستجو"
                >
                  <IoClose className="h-5 w-5" />
                </button>
              </div>

              <div className="relative">
                <Input
                  autoFocus
                  type="text"
                  value={input}
                  onChange={handleSearchInput}
                  placeholder="دنبال چی میگردی؟"
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-100 pr-4 pl-24 text-sm shadow-sm outline-none transition focus:border-orange-400 focus:bg-white"
                />

                {input.trim() && (
                  <button
                    type="button"
                    onClick={() => setInput("")}
                    className="absolute left-12 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-200 hover:text-gray-800"
                    aria-label="پاک کردن جستجو"
                  >
                    <IoClose className="h-4 w-4" />
                  </button>
                )}

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute left-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 hover:text-white"
                  aria-label="جستجو"
                >
                  <SearchIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
              {debouncedInput.trim().length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-8 text-center text-gray-500">
                  <SearchIcon className="mb-3 h-10 w-10 text-orange-300" />
                  <p className="text-sm font-medium text-gray-700">
                    دنبال محصول موردنظرت بگرد
                  </p>
                  <p className="mt-1 text-xs">
                    نام محصول را در کادر بالا وارد کن.
                  </p>
                </div>
              ) : searchLoading ? (
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <SearchResultsSkeleton size="md" rows={5} />
                </div>
              ) : searchData.length === 0 ? (
                <div className="rounded-2xl bg-white px-3 py-8 text-center text-sm text-gray-500 shadow-sm">
                  نتیجه‌ای برای «{debouncedInput}» پیدا نشد.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-gray-500">نتایج جستجو</p>
                    {isSearchRefreshing && (
                      <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <Spinner size="sm" label="به‌روزرسانی نتایج جستجو" />
                        به‌روزرسانی…
                      </span>
                    )}
                  </div>
                  {searchData.map((item) => (
                    <Link
                      href={item.permalink}
                      key={item.id}
                      onClick={closeSearch}
                      className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white p-3 shadow-sm transition active:bg-orange-50"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                        <img
                          className="h-full w-full object-cover"
                          src={item.images[0]?.src || "/placeholder.png"}
                          alt={item.name}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-gray-700">
                          {item.name}
                        </p>
                        <span className="mt-1 block text-sm font-bold text-orange-500">
                          {sp(item?.prices.price)} تومان
                        </span>
                      </div>
                      <IoIosArrowBack className="h-4 w-4 shrink-0 text-gray-400" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <div
        className={`fixed left-0 top-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl transition-transform duration-300 ${
          isCartOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700"
            aria-label="بستن سبد خرید"
          >
            <IoClose className="h-5 w-5" />
          </button>
          <h3 className="text-base font-bold text-gray-800">سبد خرید</h3>
        </div>

        <div className="flex h-[calc(100%-72px)] items-center justify-center px-6 text-center text-sm text-gray-500">
          سبد خرید خالی است.
        </div>
      </div>

      <nav className="mx-auto mt-4 w-[92%] max-w-[1400px]">
        <div className="flex items-center justify-start gap-3">
          <div
            className="relative w-full max-w-[200px]"
            onMouseEnter={() => setIsMenuOpen(true)}
            onMouseLeave={() => setIsMenuOpen(false)}
          >
            <button
              type="button"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
              className="flex w-full items-center justify-center gap-2 rounded-md cursor-pointer
               bg-orange-500 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-orange-600"
            >
              <RxHamburgerMenu size={20} />
              <span>دسته بندی ها</span>
              <IoIosArrowBack
                className={`text-xs transition-transform duration-200 ${isMenuOpen ? "-rotate-90" : ""}`}
              />
            </button>

            <div
              className={`absolute top-full z-50 w-[min(88vw,820px)]
                 pt-3 transition-all duration-200 ease-out ${
                   isMenuOpen
                     ? "visible opacity-100 translate-y-0"
                     : "invisible opacity-0 translate-y-2 pointer-events-none"
                 }`}
            >
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_24px_48px_rgba(15,23,42,0.12)]">
                <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_1fr]">
                  {/* ستون اول: دسته‌های اصلی */}
                  <nav
                    className="flex flex-col gap-1 bg-gray-50/60 p-3 lg:border-e lg:border-gray-100"
                    aria-label="دسته‌بندی‌های اصلی"
                  >
                    {sortedCategories.map((category) => {
                      const Icon = categoriesIcons.find(
                        (categoryIcon) => categoryIcon.id === category.id,
                      )?.icon;
                      const isActive = activeCategory?.id === category.id;

                      return (
                        <Link
                          href={`/products/category/${category.slug}`}
                          key={category.id}
                          onMouseEnter={() => handleMouseEnter(category)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                           text-right text-sm font-bold transition ${
                             isActive
                               ? "bg-white text-orange-500 shadow-sm"
                               : "text-gray-700 hover:bg-white hover:text-orange-500"
                           }`}
                        >
                          {Icon && <Icon className="h-6 w-6 shrink-0" />}
                          <span className="flex-1">{category.name}</span>
                          <IoIosArrowBack
                            size={14}
                            className={
                              isActive ? "text-orange-400" : "text-gray-300"
                            }
                          />
                        </Link>
                      );
                    })}
                  </nav>

                  {/* ستون دوم: زیردسته‌های دسته فعال */}
                  <div className="flex min-h-[240px] flex-col p-3 lg:border-e lg:border-gray-100">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="text-xs font-medium text-gray-400">
                        {activeCategory?.name}
                      </span>
                      <Link
                        href={`/products/category/${activeCategory?.slug}`}
                        className="text-xs font-medium text-orange-500 transition hover:text-orange-600"
                      >
                        مشاهده همه
                      </Link>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      {isPending || isFetching ? (
                        <MainMenuSkeleton rows={4} />
                      ) : subCategoryData.length === 0 ? (
                        <p className="px-3 py-8 text-center text-xs text-gray-400">
                          زیردسته‌ای برای این دسته بندی ثبت نشده است.
                        </p>
                      ) : (
                        subCategoryData.map((category) => (
                          <Link
                            href={`/products/category/${category.slug}`}
                            key={category.id}
                            className="rounded-lg px-3 py-2 text-sm text-gray-600
                             transition hover:bg-orange-50 hover:text-orange-500"
                          >
                            {category.name}
                          </Link>
                        ))
                      )}
                    </div>
                  </div>

                  {/* ستون سوم: رزرو شده — فعلاً خالی تا ساختار ستون‌ها بهم نخورد */}
                  <div
                    className="hidden min-h-[240px] lg:block"
                    aria-hidden="true"
                  />
                </div>

                {/* دکمه کشیده پایین مگامنو */}
                <div className="border-t border-gray-100 bg-gray-50/60 p-3">
                  <Link
                    href="/products"
                    className="flex w-full items-start justify-center gap-2 rounded-lg
                     bg-orange-400 py-3 text-sm font-normal text-white
                     transition hover:bg-orange-500 hover:text-white"
                  >
                    <span>همه دسته بندی ها</span>
                    <IoGridOutline size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>

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
    </>
  );
}
