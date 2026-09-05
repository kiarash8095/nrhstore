"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { RxHamburgerMenu } from "react-icons/rx";
import { IoIosArrowBack } from "react-icons/io";
import { IoClose } from "react-icons/io5";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { getSearchResult } from "@/services/searchInputHeader";
import { useDebounce } from "@/hooks/useDebounce";
import { Category, SubCategory } from "@/types/category";
import { SearchResult } from "@/types/search-result";
import { getSubCategories } from "@/services/categories";
import { sp } from "@/utils/numbers";
import { SkeletonAvatar } from "../skeleton/searchResultSkeleton";
import { Skeleton } from "../ui/skeleton";
import userRound from "@/public/user-round.svg";
import handBag from "@/public/handbag.svg";
import desktopLogo from "@/public/nrh-header-desktop.png";

interface HeaderProps {
  categories: Category[];
}

const secondaryMenu = [
  { name: "فروشگاه", href: "/products" },
  { name: "بلاگ", href: "/blog" },
  { name: "سوالات متداول", href: "/qa" },
  { name: "تماس با ما", href: "/contact-us" },
];

export default function Header({ categories }: HeaderProps) {
  const [input, setInput] = useState("");
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  const debouncedInput = useDebounce(input, 500);
  const queryClient = useQueryClient();

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
    setActiveCategory(category);
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

  const { data: searchData = [], isPending: searchLoading } = useQuery<
    SearchResult[]
  >({
    queryKey: ["get-search-result", debouncedInput],
    queryFn: () => getSearchResult(debouncedInput),
    enabled: debouncedInput.trim().length > 0,
    staleTime: 60 * 1000,
  });

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-gray-100
       bg-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-sm"
      >
        <div className="mx-auto flex w-[92%] max-w-[1400px] items-center justify-between gap-3 py-3 lg:gap-5">
          <div className="flex min-w-0 flex-1 items-center justify-start">
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

          <div className="relative hidden w-full max-w-[520px] flex-1 sm:block">
            <Input
              type="text"
              value={input}
              onChange={handleSearchInput}
              onFocus={() => setIsInputOpen(true)}
              placeholder="دنبال چی میگردی؟"
              className="h-11 w-full rounded-full border border-gray-200 bg-[#f7f7f7] pr-12 pl-11 text-sm shadow-sm transition focus:border-orange-400 focus:bg-white"
            />

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute left-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-gray-200 text-gray-700 hover:bg-orange-500 hover:text-white"
            >
              <SearchIcon className="h-4 w-4" />
            </Button>

            {input.trim() && (
              <button
                type="button"
                onClick={() => setInput("")}
                className="absolute left-12 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-200 hover:text-gray-800"
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
                <SkeletonAvatar />
              ) : searchData.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  نتیجه‌ای پیدا نشد.
                </div>
              ) : (
                <div className="space-y-1">
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

          <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsInputOpen((open) => !open)}
              className="relative z-[70] flex h-11 w-11 items-center justify-center rounded-full bg-[#f6f6f6] text-gray-700 shadow-sm transition hover:bg-orange-500 hover:text-white sm:hidden"
              aria-label="جستجو"
            >
              <SearchIcon className="h-4 w-4" />
            </button>

            <div className="relative group">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:border-orange-500 hover:shadow-md"
                aria-label="حساب کاربری"
              >
                <Image className="h-5 w-5" src={userRound} alt="لوگوی کاربری" />
              </button>

              <div className="invisible absolute left-1/2 top-full z-30 mt-2 w-40 -translate-x-1/2 rounded-xl border border-gray-100 bg-white p-3 text-xs text-gray-700 opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0">
                <p className="font-bold text-gray-800">حساب کاربری</p>
                <p className="mt-2 text-gray-500">تسویه سبد خرید</p>
              </div>
            </div>

            <div className="relative group">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:border-orange-500 hover:shadow-md"
                aria-label="سبد خرید"
              >
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1a1a1a] px-1 text-[9px] font-bold text-white">
                  2
                </span>
                <Image className="h-5 w-5" src={handBag} alt="لوگوی سبد خرید" />
              </button>

              <div className="invisible absolute left-1/2 top-full z-30 mt-2 w-40 -translate-x-1/2 rounded-xl border border-gray-100 bg-white p-3 text-xs text-gray-700 opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0">
                <p className="font-bold text-gray-800">سبد خرید</p>
                <p className="mt-2 text-gray-500">تسویه سبد خرید</p>
              </div>
            </div>
          </div>
        </div>

        {isInputOpen && (
          <div
            className=""
            onClick={closeSearch}
            role="presentation"
          >
            <div
              className="mx-auto mt-10 w-full max-w-md rounded-[28px] bg-white p-3 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative">
                <Input
                  type="text"
                  value={input}
                  onChange={handleSearchInput}
                  onFocus={() => setIsInputOpen(true)}
                  placeholder="دنبال چی میگردی؟"
                  className="h-12 w-full rounded-full border border-gray-200 bg-gray-100 pr-12 pl-11 text-sm shadow-sm outline-none transition focus:border-orange-400 focus:bg-white"
                />

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute left-2 top-1/2 h-9 w-9 -translate-y-1/2
                   rounded-full bg-gray-200 text-gray-700"
                >
                  <SearchIcon className="h-4 w-4" />
                </Button>

                <button
                  type="button"
                  onClick={closeSearch}
                  className="absolute left-12 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-200 hover:text-gray-800"
                  aria-label="بستن جستجو"
                >
                  <IoClose className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 max-h-[55vh] overflow-y-auto rounded-2xl bg-gray-50 p-2">
                {searchLoading ? (
                  <SkeletonAvatar />
                ) : searchData.length === 0 ? (
                  <div className="px-3 py-5 text-center text-sm text-gray-500">
                    نتیجه‌ای پیدا نشد.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {searchData.map((item) => (
                      <Link
                        href={item.permalink}
                        key={item.id}
                        onClick={closeSearch}
                        className="flex items-center gap-3 rounded-2xl border-b border-gray-200 bg-white p-2 transition hover:bg-orange-50"
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
        <div className="flex items-center justify-between gap-3">
          <div
            className="relative w-full max-w-[200px]"
            onMouseEnter={() => setIsMenuOpen(true)}
            onMouseLeave={() => setIsMenuOpen(false)}
          >
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-orange-600"
            >
              <RxHamburgerMenu size={15} />
              <span>دسته بندی ها</span>
              <IoIosArrowBack
                className={`text-xs transition-transform duration-200 ${isMenuOpen ? "-rotate-90" : ""}`}
              />
            </button>

            <div
              className={`absolute top-full z-50 w-[min(92vw,760px)]
                 pt-3 transition-all duration-200 ease-out ${
                   isMenuOpen
                     ? "visible opacity-100 translate-y-0"
                     : "invisible opacity-0 translate-y-2 pointer-events-none"
                 }`}
            >
              <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_20px_40px_rgba(15,23,42,0.08)] lg:flex-row">
                <div className="w-full lg:w-52">
                  <div className="mb-2 px-3 py-2">
                    <span className="text-sm font-bold text-gray-800">
                      دسته بندی ها
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    {categories?.map((category) => (
                      <Link
                        href={`/products/category/${category.slug}`}
                        key={category.id}
                        onMouseEnter={() => handleMouseEnter(category)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-right text-sm font-bold text-gray-700 transition hover:bg-orange-50 hover:text-orange-500"
                      >
                        <span>{category.name}</span>
                        <IoIosArrowBack size={16} />
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="w-full min-h-[220px] rounded-xl bg-gray-50 p-2 lg:w-60 lg:border-r lg:border-gray-100 lg:p-3">
                  <div className="mb-2 px-2 py-1">
                    <Link
                      href={`/products/category/${activeCategory?.slug}`}
                      className="text-sm text-gray-700 hover:text-orange-500"
                    >
                      مشاهده ی همه {activeCategory?.name}
                    </Link>
                  </div>

                  <div className="flex flex-col gap-1">
                    {isPending || isFetching ? (
                      <>
                        <Skeleton className="h-6 w-full rounded-md" />
                        <Skeleton className="h-6 w-5/6 rounded-md" />
                        <Skeleton className="h-6 w-4/5 rounded-md" />
                        <Skeleton className="h-6 w-3/4 rounded-md" />
                      </>
                    ) : (
                      subCategoryData.map((category) => (
                        <div
                          key={category.id}
                          className="rounded-lg px-2 py-2 text-sm text-gray-600 hover:bg-white hover:text-orange-500"
                        >
                          {category.name}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="w-full min-h-[220px] rounded-xl bg-gray-50 p-2 lg:w-60 lg:p-3">
                  <div className="mb-2 px-2 py-1">
                    <span className="text-sm font-bold text-gray-800">
                      محصولات
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      className="w-full rounded-lg px-3 py-2 text-right text-sm text-gray-700 transition hover:bg-white hover:text-orange-500"
                    >
                      محصول اول
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-lg px-3 py-2 text-right text-sm text-gray-700 transition hover:bg-white hover:text-orange-500"
                    >
                      محصول دوم
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1">
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
