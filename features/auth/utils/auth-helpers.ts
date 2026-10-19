import type {
ErrorNamespacePath,
FieldPath,
FieldValues,
UseFormReturn,
} from "react-hook-form";

import { toAuthClientError } from "../api/auth.error";
import type { AuthUser } from "../types/auth-user.types";

export { maskIranMobile,normalizeIranMobile,toAsciiDigits } from "@/features/auth/contracts";

/** نام نمایشی کاربر؛ اگر نامش ثبت نشده باشد شماره‌ی ماسک‌شده نشان داده می‌شود */
export function getUserDisplayName(user: AuthUser | null): string {
  if (!user) return "کاربر مهمان";

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;

  return user.phone ? maskPhoneForDisplay(user.phone) : "کاربر نوین رایانه";
}

function maskPhoneForDisplay(phone: string): string {
  if (phone.length !== 11) return phone;
  return `${phone.slice(0, 4)}***${phone.slice(7)}`;
}

/** حرف اول نام و نام خانوادگی برای آواتار متنی */
export function getUserInitials(user: AuthUser | null): string {
  if (!user) return "؟";

  const first = user.firstName?.trim().charAt(0);
  const last = user.lastName?.trim().charAt(0);

  if (first && last) return `${first}${last}`;
  if (first) return first;

  return user.phone.slice(-2) || "؟";
}

/**
 * نمایش خطای یکنواخت روی فرم.
 *
 * خطاهای سطح فیلد که سرور برگردانده (مثل «این شماره قبلاً ثبت شده») روی همان فیلد
 * می‌نشینند و بقیه روی ریشه‌ی فرم. فرم‌ها به‌این‌ترتیب هیچ منطق تجاری‌ای ندارند:
 * فقط نتیجه را نمایش می‌دهند.
 */
export function applyAuthError<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
  fallbackField: FieldPath<T> | ErrorNamespacePath = "root",
): void {
  const clientError = toAuthClientError(error);

  if (clientError.fields) {
    const fieldNames = Object.keys(clientError.fields);
    let applied = false;

    for (const fieldName of fieldNames) {
      const path = fieldName.split(".")[0] as FieldPath<T>;

      if (path in form.getValues()) {
        form.setError(path, {
          type: "server",
          message: clientError.fields[fieldName],
        });
        applied = true;
      }
    }

    if (applied) return;
  }

  form.setError(fallbackField, {
    type: "server",
    message: clientError.message,
  });
}

/** ثانیه‌های باقی‌مانده تا یک زمان مشخص؛ برای شمارش معکوس ارسال مجدد کد */
export function secondsUntil(targetAt: number | null): number {
  if (!targetAt) return 0;
  return Math.max(0, Math.ceil((targetAt - Date.now()) / 1000));
}
