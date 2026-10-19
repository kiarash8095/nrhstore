import { redirect } from "next/navigation";
import { cache } from "react";
import "server-only";

import type { AuthUserDto } from "../contracts";
import { safeAuthNextPath } from "../contracts";
import { authAdapter } from "./backend/adapter";
import { isEmptyJar,readJarFromCookies } from "./cookies";

/**
 * Data Access Layer احراز هویت — فقط سمت سرور.
 *
 * این ماژول `next/headers` را import می‌کند؛ پس اگر اشتباهی از یک Client Component
 * import شود، build با خطای واضح می‌شکند. اینجا هیچ‌وقت کوکی نوشته نمی‌شود
 * (در حین رندر Server Component ممکن نیست) و نشست با `/me` و سبد کوکی موجود
 * اعتبارسنجی می‌شود؛ پس رندر صفحه نشست مرورگر را تغییر نمی‌دهد.
 *
 * محافظت واقعی همین‌جاست: Proxy فقط یک بررسی خوش‌بینانه (وجود کوکی) است و
 * تصمیم نهایی با این لایه گرفته می‌شود.
 */

/** کاربر جاری یا `null`. با `cache` در طول یک رندر فقط یک‌بار به بک‌اند می‌زند. */
export const getCurrentUser = cache(async (): Promise<AuthUserDto | null> => {
  const jar = await readJarFromCookies();
  if (isEmptyJar(jar)) return null;

  return authAdapter.getMe(jar);
});

/** برای صفحات محافظت‌شده: یا کاربر را برمی‌گرداند یا به صفحه‌ی اصلی با پرچم ورود هدایت می‌کند */
export async function requireUser(nextPath?: string): Promise<AuthUserDto> {
  const user = await getCurrentUser();

  if (!user) {
    const params = new URLSearchParams({ auth: "login" });
    const destination = safeAuthNextPath(nextPath);
    if (destination) params.set("next", destination);
    redirect(`/?${params.toString()}`);
  }

  return user;
}
