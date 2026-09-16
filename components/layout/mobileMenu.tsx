"use client";

import { mobileMenuItems } from "@/constants/MobileMenuItems";
import { CgArrowsExchangeAlt } from "react-icons/cg";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type Props = {
  /**
   * اکشن اصلی صفحه محصول (افزودن به سبد خرید).
   * با پاس شدنش، داک به‌جای نمایش همیشگی منو، بین منو و این اکشن سوییچ می‌کند.
   */
  cart?: ReactNode;
};

/** فقط صفحه‌ی جزئیات محصول؛ /products/category/<slug> را محصول حساب نمی‌کند. */
const PRODUCT_DETAIL_PATH = /^\/products\/(?!category(?:\/|$))[^/]+\/?$/;

export default function MobileMenu({ cart }: Props) {
  const pathname = usePathname();
  const [isDockVisible, setIsDockVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isProductPage = PRODUCT_DETAIL_PATH.test(pathname);
  const canSwitch = isProductPage && Boolean(cart);

  useEffect(() => {
    const timer = setTimeout(() => setIsDockVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // روی صفحه‌ی محصول منوی سراسری رندر نمی‌شود؛ داک همان صفحه (همراه با اکشن خرید) جایش را می‌گیرد.
  if (isProductPage && !cart) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-100 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div
        className={`relative transition-all duration-500 ease-out ${
          isDockVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0"
        }`}
      >
        {canSwitch && (
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-dock-panels"
            aria-label={
              isMenuOpen
                ? "بستن منو و نمایش افزودن به سبد خرید"
                : "نمایش منوی پایین صفحه"
            }
            className="pointer-events-auto absolute -top-12 right-0 flex h-11 w-11
             items-center justify-center rounded-l-xl border border-r-0
             border-gray-200 bg-white text-gray-600 shadow-md transition
             hover:border-orange-300 hover:text-orange-500 active:scale-95
             focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
          >
            <CgArrowsExchangeAlt
              size={22}
              className={`transition-transform duration-300 ${
                isMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        )}

        <div
          id="mobile-dock-panels"
          className="pointer-events-auto mx-3 mb-3 grid overflow-hidden rounded-2xl border
           border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        >
          {/* منوی پایین */}
          <div
            inert={canSwitch && !isMenuOpen}
            className={`col-start-1 row-start-1 flex min-h-[52px] items-center
             justify-between p-1 transition-all duration-300 ease-out ${
               isMenuOpen || !canSwitch
                 ? "translate-y-0 opacity-100"
                 : "pointer-events-none translate-y-3 opacity-0"
             }`}
          >
            {mobileMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.name}
                  className="
                    flex-1 text-center pt-2 pb-1 cursor-pointer
                    transition-all duration-300
                    hover:text-orange-500 hover:-translate-y-0.5
                  "
                >
                  <Icon className="w-5 h-5 mx-auto" width={5} />
                  <span className="mt-1 block text-[10px] sm:text-xs whitespace-nowrap">
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* اکشن صفحه‌ی محصول */}
          {cart && (
            <div
              inert={isMenuOpen}
              className={`col-start-1 row-start-1 flex min-h-[52px] items-center
               p-1 transition-all duration-300 ease-out ${
                 isMenuOpen
                   ? "pointer-events-none -translate-y-3 opacity-0"
                   : "translate-y-0 opacity-100"
               }`}
            >
              {cart}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
