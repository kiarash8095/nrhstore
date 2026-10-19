import { bannerDocumentSchema } from "@/features/banners/schemas/banner.schema";
import { bannerError,bannerJson,requireBannerAdmin } from "@/features/banners/server/http";
import { BannerConflictError,saveBannerDocument } from "@/features/banners/server/store";
import { revalidatePath } from "next/cache";
import { type NextRequest } from "next/server";



export async function PUT(request: NextRequest) {
  const denied = requireBannerAdmin(request, true);
  if (denied) return denied;
  if (Number(request.headers.get("content-length")) > 100_000) return bannerError("درخواست بیش از حد بزرگ است.", 413);
  const input = bannerDocumentSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return bannerError(input.error.issues[0]?.message || "اطلاعات بنرها نامعتبر است.", 400);
  try {
    const document = await saveBannerDocument(input.data);
    revalidatePath("/");
    revalidatePath("/banners-admin");
    return bannerJson({ ...document, message: "تغییرات با موفقیت ذخیره شد و بنرهای سایت به‌روز شدند." });
  } catch (error) {
    if (error instanceof BannerConflictError) return bannerError(error.message, 409);
    console.error("[banners:save]", error);
    return bannerError("ذخیره تغییرات ممکن نشد. دوباره تلاش کنید.", 500);
  }
}
