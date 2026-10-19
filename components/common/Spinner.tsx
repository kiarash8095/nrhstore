"use client";

import { ThreeDots,Triangle } from "react-loader-spinner";

import { cn } from "@/lib/utils";

/** نارنجی برند؛ هم‌خوان با bg-orange-500 در رابط کاربری */
const BRAND_COLOR = "#f97316";

type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
  size?: SpinnerSize;
  /** متن اعلام‌شده به صفحه‌خوان‌ها */
  label?: string;
  className?: string;
}

const DOTS_HEIGHT: Record<SpinnerSize, number> = { sm: 10, md: 14, lg: 18 };

/**
 * اسپینر کوچک برای بارگذاری‌های درون‌کامپوننتی (مثل تازه‌سازی نتایج جستجو)
 * که ساختار ثابتی برای اسکلتون ندارند.
 */
export function Spinner({
  size = "sm",
  label = "در حال بارگذاری",
  className,
}: SpinnerProps) {
  const height = DOTS_HEIGHT[size];

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center justify-center", className)}
    >
      <ThreeDots
        height={height}
        width={height * 3.4}
        color={BRAND_COLOR}
        ariaLabel={label}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

interface PageLoaderProps {
  label?: string;
  className?: string;
}

/**
 * لودر صفحاتی که ساختار محتوایشان از پیش مشخص نیست؛
 * برای صفحات دارای ساختار ثابت، از اسکلتون همان صفحه استفاده کنید.
 */
export function PageLoader({
  label = "در حال بارگذاری…",
  className,
}: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-[60vh] w-full flex-col items-center justify-center gap-4",
        className,
      )}
    >
      <Triangle height={90} width={90} color={BRAND_COLOR} ariaLabel={label} />
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}
