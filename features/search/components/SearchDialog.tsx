"use client";

import { Spinner } from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sp } from "@/utils/numbers";
import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { productPath } from '@/lib/urls';
import { IoIosArrowBack } from "react-icons/io";
import { IoClose } from "react-icons/io5";
import { useSearchContext } from "./SearchProvider";
import { SearchResultsSkeleton } from "./SearchResultsSkeleton";

export function SearchDialog() {
  const { input, setInput, isInputOpen, debouncedInput, searchData, searchLoading, isSearchRefreshing, handleSearchInput, closeSearch } = useSearchContext();
  return (<>{isInputOpen && (
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
                      href={productPath(item.slug || String(item.id))}
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
        )}</>);
}
