import { bannerError,bannerJson } from "@/features/banners/server/http";
import { readBannerDocument } from "@/features/banners/server/store";



export async function GET() {
  try {
    return bannerJson(await readBannerDocument());
  } catch (error) {
    console.error("[banners:read]", error);
    return bannerError("دریافت بنرها ممکن نشد.", 500);
  }
}
