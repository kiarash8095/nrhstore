import { Suspense } from "react";
import { HiOutlineViewGrid } from "react-icons/hi";

import { CategoriesGrid } from "@/features/categories/components/CategoriesGrid";
import { CategoriesGridSkeleton } from "@/features/categories/components/skeletons/CategoriesGridSkeleton";



export default function CategoriesPage() {
  return (
    <div className="mx-auto w-[92%] max-w-7xl py-8 sm:py-12">
      <header className="mb-6 flex items-center gap-3 sm:mb-10">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl
         border border-orange-100 bg-orange-50 text-orange-500 sm:h-14 sm:w-14">
          <HiOutlineViewGrid className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-lg font-black text-gray-900 sm:text-2xl">
            دسته‌بندی‌ها
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            دسته‌ی موردنظرتان را انتخاب کنید تا محصولات آن را ببینید.
          </p>
        </div>
      </header>

      {/* کارت‌ها با مرز Suspense جدا استریم می‌شوند تا سربرگ صفحه فوراً نمایش داده شود */}
      <Suspense fallback={<CategoriesGridSkeleton withHeader={false} />}>
        <CategoriesGrid />
      </Suspense>
    </div>
  );
}
