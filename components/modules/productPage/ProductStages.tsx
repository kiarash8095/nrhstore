"use client";

import { useEffect, useRef, useState } from "react";
import { FaAngleDown, FaAngleUp } from "react-icons/fa";
import { removeTagP } from "@/utils/shortText";
import { Products } from "@/types/products-types";
import { RatingSection } from "@/components/modules/productPage/RatingSection";
import { ShopDetails } from "@/components/modules/productPage/ShopDetails";

interface ProductStagesProps {
  product: Products;
}

const stages = [
  { id: 1, name: "توضیحات" },
  { id: 2, name: "مشخصات" },
  { id: 3, name: "دیدگاه" },
];

export function ProductStages({ product }: ProductStagesProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [isSticky, setIsSticky] = useState(false);
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const navigationRef = useRef<HTMLDivElement | null>(null);
  const navigationMarkerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const marker = navigationMarkerRef.current;
    if (!marker) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0 },
    );

    observer.observe(marker);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateCurrentStage = () => {
      const navigationOffset = navigationRef.current?.offsetHeight ?? 0;
      const targetPosition = window.scrollY + navigationOffset + 24;
      let visibleStage = 0;

      stageRefs.current.forEach((stageRef, index) => {
        const stagePosition = stageRef
          ? stageRef.getBoundingClientRect().top + window.scrollY
          : Number.POSITIVE_INFINITY;

        if (stagePosition <= targetPosition) {
          visibleStage = index;
        }
      });

      setCurrentStage(visibleStage);
    };

    updateCurrentStage();
    window.addEventListener("scroll", updateCurrentStage, { passive: true });
    window.addEventListener("resize", updateCurrentStage);

    return () => {
      window.removeEventListener("scroll", updateCurrentStage);
      window.removeEventListener("resize", updateCurrentStage);
    };
  }, []);

  const goToStage = (stageIndex: number) => {
    const nextStage = Math.max(0, Math.min(stageIndex, stages.length - 1));

    const target = stageRefs.current[nextStage];
    if (!target) return;

    setCurrentStage(nextStage);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto flex w-[95%] flex-col gap-8 lg:flex-row lg:justify-between lg:gap-5">
      <div className="flex w-full flex-col lg:w-md">
        <div ref={navigationMarkerRef} className="h-px w-full" />
        <div
          ref={navigationRef}
          className={`sticky top-5 z-40 mb-6 flex w-full flex-col gap-4 rounded-2xl bg-white p-3 transition-shadow duration-300 sm:flex-row sm:items-center sm:justify-between lg:w-3xl ${
            isSticky ? "shadow-xl" : "shadow-lg"
          }`}
        >
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="min-w-24">
              <span className="text-xs font-light text-gray-400">بخش فعلی</span>
              <div className="relative mt-1 h-6 overflow-hidden">
                {stages.map((stage, index) => (
                  <p
                    key={stage.id}
                    className={`absolute right-0 text-sm font-bold transition-all duration-300 sm:text-base ${
                      index === currentStage
                        ? "translate-y-0 opacity-100"
                        : index < currentStage
                          ? "-translate-y-6 opacity-0"
                          : "translate-y-6 opacity-0"
                    }`}
                  >
                    {stage.name}
                  </p>
                ))}
              </div>
            </div>

            <div className="flex flex-row items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => goToStage(currentStage - 1)}
                disabled={currentStage === 0}
                aria-label="رفتن به بخش قبلی"
                className="transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
              >
                <FaAngleUp size={18} />
              </button>
              <button
                type="button"
                onClick={() => goToStage(currentStage + 1)}
                disabled={currentStage === stages.length - 1}
                aria-label="رفتن به بخش بعدی"
                className="transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
              >
                <FaAngleDown size={18} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-4">
            {stages.map((stage, index) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => goToStage(index)}
                className={`text-xs font-light transition duration-300 sm:text-sm ${
                  index === currentStage
                    ? "font-bold text-orange-500"
                    : "cursor-pointer text-gray-500 hover:text-orange-400"
                }`}
              >
                {stage.name}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={(element) => {
            stageRefs.current[0] = element;
            if (element) element.style.scrollMarginTop = "7rem";
          }}
          className=""
        >
          <div className="relative flex w-full flex-wrap items-center gap-2 p-2 sm:gap-8 lg:w-3xl">
            <span className="p-2 text-sm font-bold text-orange-500 sm:text-base">
              {stages[0].id}
            </span>
            <p className="text-sm sm:text-base">{stages[0].name}</p>
            <div className="h-[1px] min-w-0 flex-1 bg-gray-300" />
          </div>
          <div className="mb-4 w-full rounded-xl p-2 shadow-xl sm:p-4 lg:w-3xl">
            <p className="p-2 text-xs font-light leading-7 text-gray-600 sm:p-3 sm:text-sm sm:leading-8">
              {removeTagP(product.description)}
            </p>
          </div>
        </div>

        <div
          ref={(element) => {
            stageRefs.current[1] = element;
            if (element) element.style.scrollMarginTop = "7rem";
          }}
          className=""
        >
          <div className="relative mb-2 flex w-full flex-wrap items-center gap-2 p-2 sm:gap-8 lg:w-3xl">
            <span className="p-2 text-sm font-bold text-orange-500 sm:text-base">
              {stages[1].id}
            </span>
            <p className="text-sm sm:text-base">{stages[1].name}</p>
            <div className="h-[1px] min-w-0 flex-1 bg-gray-200" />
          </div>
          <div className="mb-4 w-full overflow-x-auto rounded-xl p-3 shadow-lg sm:p-6 lg:w-3xl">
            <table className="w-full min-w-[280px] text-right text-xs sm:text-sm">
              <thead className="border-b border-gray-300 text-gray-600">
                <tr>
                  <th scope="col" className="px-2 py-3 font-bold sm:px-3">
                    مشخصات
                  </th>
                  <th scope="col" className="px-2 py-3 font-bold sm:px-3">
                    مقدار
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {product.attributes.map((attr) => (
                  <tr key={attr.name} className="align-top">
                    <th
                      scope="row"
                      className="whitespace-nowrap px-2 py-3 text-right font-normal text-gray-700 sm:px-3"
                    >
                      {attr.name}
                    </th>
                    <td className="break-words px-2 py-3 font-light text-gray-500 sm:px-3">
                      {attr.terms[0]?.name || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div
          ref={(element) => {
            stageRefs.current[2] = element;
            if (element) element.style.scrollMarginTop = "7rem";
          }}
          className=""
        >
          <div className="relative flex w-full flex-wrap items-center gap-2 p-2 sm:gap-8 lg:w-3xl">
            <span className="p-2 text-sm font-bold text-orange-500 sm:text-base">
              {stages[2].id}
            </span>
            <p className="text-sm sm:text-base">{stages[2].name}</p>
            <div className="h-[1px] min-w-0 flex-1 bg-gray-200" />
          </div>
          <RatingSection product={product} />
        </div>
      </div>

      <div className="w-full lg:w-xs">
        <ShopDetails product={product} />
      </div>
    </div>
  );
}
