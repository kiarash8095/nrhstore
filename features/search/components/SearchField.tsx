"use client";

import { Spinner } from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sp } from "@/utils/numbers";
import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { productPath } from '@/lib/urls';
import { IoClose } from "react-icons/io5";
import { useSearchContext } from "./SearchProvider";
import { SearchResultsSkeleton } from "./SearchResultsSkeleton";

export function SearchField() {
  const { input, setInput, isInputOpen, setIsInputOpen, debouncedInput, searchData, searchLoading, isSearchRefreshing, handleSearchInput, closeSearch } = useSearchContext();
  return (<div className="relative w-full max-w-[520px] flex-1 ">
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
                        href={productPath(item.slug || String(item.id))}
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
            </div>);
}
