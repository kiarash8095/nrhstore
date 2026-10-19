import { NextResponse, type NextRequest } from "next/server";

import { getSessionCookieName } from "@/features/auth/config";

/**
 * Proxy = جانشین middleware در Next.js 16 (فایل `middleware.ts` منسوخ شده است).
 *
 * اینجا فقط «بررسی خوش‌بینانه» انجام می‌شود: آیا اصلاً کوکی نشست وجود دارد؟
 * طبق مستندات Next، بررسی سنگین (تماس با بک‌اند) نباید در Proxy باشد — چون روی هر
 * درخواست اجرا می‌شود و تنها لایه‌ی دفاعی هم نیست. تصمیم نهایی درباره‌ی دسترسی در
 * `features/auth/server/dal.ts` روی خود صفحه (Server Component) گرفته می‌شود.
 */
export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(getSessionCookieName())?.value);

  if (hasSession) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";

  // پرچم `auth=login` باعث می‌شود مودال ورود در صفحه‌ی اصلی خودکار باز شود
  // و `next` مقصد بعدی کاربر را نگه می‌دارد.
  url.searchParams.set("auth", "login");
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/account/:path*"],
};
