"use client";

import { useQuery,useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { IoIosArrowBack } from "react-icons/io";
import { IoGridOutline } from "react-icons/io5";
import { RxHamburgerMenu } from "react-icons/rx";
import { getSubCategories } from "../api/categories.client";
import type { Category,SubCategory } from "../types/category.types";
import { MainMenuSkeleton } from "./skeletons/MainMenuSkeleton";
import { CategoryIcons } from '../constants/category-icons';
import { getHeaderCategories, getMainCategoryKey } from '../constants/navigation';
import { categoryPath } from '@/lib/urls';

export function CategoryMenu({ categories }: { categories: Category[] }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const sortedCategories = getHeaderCategories(categories);
  const activeCategory = sortedCategories.find(category => category.id === hoveredCategoryId) ?? sortedCategories[0] ?? null;

  const handleMouseEnter = (category: Category) => {
    setHoveredCategoryId(category.id);
    void queryClient.prefetchQuery({
      queryKey: ["sub-category", category?.id],
      queryFn: ({ signal }) => getSubCategories(category.id, signal),
      staleTime: 1000 * 60 * 10,
    });
  };

  const {
    data: subCategoryData = [],
    isPending,
    isError,
    refetch,
  } = useQuery<SubCategory[]>({
    queryKey: ["sub-category", activeCategory?.id],
    queryFn: ({ signal }) => getSubCategories(activeCategory!.id, signal),
    enabled: isMenuOpen && !!activeCategory?.id,
    staleTime: 1000 * 60 * 10,
  });


  return (<div
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
                      const categoryKey = getMainCategoryKey(category);
                      const Icon = categoryKey ? CategoryIcons[categoryKey] : undefined;
                      const isActive = activeCategory?.id === category.id;

                      return (
                        <Link
                          href={categoryPath(category.slug)}
                          key={category.id}
                          onMouseEnter={() => handleMouseEnter(category)}
                          onFocus={() => handleMouseEnter(category)}
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
                    {sortedCategories.length === 0 && <p className="p-3 text-xs text-gray-500">دسته‌بندی‌ها در دسترس نیستند.</p>}
                  </nav>

                  {/* ستون دوم: زیردسته‌های دسته فعال */}
                  <div className="flex min-h-[240px] flex-col p-3 lg:border-e lg:border-gray-100">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="text-xs font-medium text-gray-400">
                        {activeCategory?.name}
                      </span>
                      {activeCategory && <Link
                        href={categoryPath(activeCategory.slug)}
                        className="text-xs font-medium text-orange-500 transition hover:text-orange-600"
                      >
                        مشاهده همه
                      </Link>}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      {!activeCategory ? null : isPending ? (
                        <MainMenuSkeleton rows={4} />
                      ) : isError && subCategoryData.length === 0 ? (
                        <div className="px-3 py-8 text-center text-xs text-gray-500" role="alert">
                          <p>دریافت زیردسته‌ها انجام نشد.</p>
                          <button type="button" onClick={() => void refetch()} className="mt-3 text-orange-600 underline">تلاش دوباره</button>
                        </div>
                      ) : subCategoryData.length === 0 ? (
                        <p className="px-3 py-8 text-center text-xs text-gray-400">
                          زیردسته‌ای برای این دسته بندی ثبت نشده است.
                        </p>
                      ) : (
                        subCategoryData.map((category) => (
                          <Link
                            href={categoryPath(category.slug)}
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
                    href="/categories"
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
          </div>);
}
