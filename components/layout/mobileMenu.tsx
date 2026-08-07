"use client";
import { mobileMenuItems } from "@/constants/MobileMenuItems";
import { useState, useEffect } from "react";

export default function MobileMenu() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`
        md:hidden
        fixed bottom-0 left-0 right-0 z-50
        transition-all duration-500 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
      `}
    >
      <div className="mx-3 mb-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-1">
        <div className="flex justify-between items-center w-full">
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
      </div>
    </div>
  );
}