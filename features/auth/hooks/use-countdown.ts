"use client";

import { useEffect,useState } from "react";

import { secondsUntil } from "../utils/auth-helpers";

/**
 * شمارش معکوس تا یک زمان مشخص (برای دکمه‌ی «ارسال مجدد کد»).
 *
 * هدف شمارش در store نگه داشته می‌شود، نه در state کامپوننت؛ بنابراین اگر کاربر
 * مودال را ببندد و باز کند یا گام عوض شود، زمان باقی‌مانده گم نمی‌شود.
 *
 * مقدار باقی‌مانده در زمان رندر محاسبه می‌شود و تیک فقط یک re-render دوره‌ای
 * می‌سازد؛ به این ترتیب هرگز state و زمان واقعی از هم جدا نمی‌افتند.
 */
export function useCountdown(targetAt: number | null): number {
  // مقدار state فقط برای ایجاد re-render دوره‌ای است؛ مقدار باقی‌مانده در هر رندر
  // از زمان واقعی محاسبه می‌شود تا هرگز از ساعت عقب نماند.
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!targetAt || secondsUntil(targetAt) <= 0) return;

    const timer = setInterval(() => {
      // یک تیک آخر هم زده می‌شود تا رسیدن به صفر در UI دیده شود
      forceTick((value) => value + 1);

      if (secondsUntil(targetAt) <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetAt]);

  return secondsUntil(targetAt);
}
