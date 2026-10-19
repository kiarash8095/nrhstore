import { MAX_IMAGE_BYTES } from "@/features/banners/schemas/banner.schema";
import { bannerError,bannerJson,requireBannerAdmin } from "@/features/banners/server/http";
import { storeBannerImage } from "@/features/banners/server/store";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { type NextRequest } from "next/server";



export async function POST(request: NextRequest) {
  const denied = requireBannerAdmin(request, true);
  if (denied) return denied;
  if (!consumeRateLimit("banner-admin:uploads", 100, 60 * 60 * 1000).allowed) {
    return bannerError("تعداد بارگذاری‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.", 429);
  }
  if (Number(request.headers.get("content-length")) > MAX_IMAGE_BYTES + 65536) {
    return bannerError("حجم تصویر باید حداکثر ۵ مگابایت باشد.", 413);
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_IMAGE_BYTES ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return bannerError("تصویر JPG، PNG یا WebP با حجم حداکثر ۵ مگابایت انتخاب کنید.", 400);
  }
  try {
    return bannerJson(await storeBannerImage(new Uint8Array(await file.arrayBuffer())));
  } catch (error) {
    if (["EACCES", "EPERM", "ENOSPC", "EROFS"].includes((error as NodeJS.ErrnoException).code || "")) {
      console.error("[banners:upload]", error);
      return bannerError("ذخیره تصویر روی سرور ممکن نشد.", 500);
    }
    return bannerError("تصویر معتبر نیست؛ یک تصویر JPG، PNG یا WebP بدون انیمیشن انتخاب کنید.", 400);
  }
}
