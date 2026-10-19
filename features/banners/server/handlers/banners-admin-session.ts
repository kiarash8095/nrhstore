import { ADMIN_COOKIE,adminConfig,adminCookieOptions,checkAdminCredentials,createAdminToken } from "@/features/banners/server/admin-session";
import { bannerError,bannerJson,checkBannerOrigin } from "@/features/banners/server/http";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { type NextRequest } from "next/server";
import { z } from "zod";



const loginSchema = z.object({ username: z.string().min(1).max(100), password: z.string().min(1).max(256) }).strict();

export async function POST(request: NextRequest) {
  const originError = checkBannerOrigin(request);
  if (originError) return originError;
  if (!adminConfig()) return bannerError("اطلاعات ورود ادمین روی سرور تنظیم نشده است.", 503);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const ipLimit = consumeRateLimit(`banner-admin:${ip}`, 8, 15 * 60 * 1000);
  const globalLimit = consumeRateLimit("banner-admin:all", 60, 15 * 60 * 1000);
  if (!ipLimit.allowed || !globalLimit.allowed) {
    const response = bannerError("تعداد تلاش‌های ورود زیاد است. چند دقیقه بعد دوباره تلاش کنید.", 429);
    response.headers.set("Retry-After", String(Math.max(ipLimit.retryAfter, globalLimit.retryAfter)));
    return response;
  }
  if (Number(request.headers.get("content-length")) > 4096) return bannerError("درخواست بیش از حد بزرگ است.", 413);
  const input = loginSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return bannerError("نام کاربری و رمز عبور را وارد کنید.", 400);
  if (!checkAdminCredentials(input.data.username, input.data.password)) {
    return bannerError("نام کاربری یا رمز عبور اشتباه است.", 401);
  }
  const response = bannerJson({ message: "ورود موفق بود." });
  response.cookies.set(ADMIN_COOKIE, createAdminToken(), adminCookieOptions);
  return response;
}

export async function DELETE(request: NextRequest) {
  const originError = checkBannerOrigin(request);
  if (originError) return originError;
  const response = bannerJson({ message: "از پنل خارج شدید." });
  response.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions, maxAge: 0 });
  return response;
}
