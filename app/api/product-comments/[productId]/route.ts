import { NextRequest, NextResponse } from "next/server";
import { getProductComments } from "@/features/product_comment/api/comments.service";
import { consumeRateLimit } from "@/lib/server/rate-limit";

const PAGE_SIZE = 8;

function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const productId = Number((await params).productId);
  if (!Number.isSafeInteger(productId) || productId <= 0) {
    return NextResponse.json({ message: "شناسه محصول معتبر نیست." }, { status: 400 });
  }
  const limit = consumeRateLimit(`product-comments:${clientIp(request)}`, 120, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ message: "تعداد درخواست‌ها بیش از حد مجاز است." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }
  const pageValue = Number(request.nextUrl.searchParams.get("page") || "1");
  const page = Number.isSafeInteger(pageValue) && pageValue >= 1 && pageValue <= 100 ? pageValue : 1;
  try {
    const allComments = await getProductComments(productId);
    const start = (page - 1) * PAGE_SIZE;
    const comments = allComments.slice(start, start + PAGE_SIZE);
    const response = NextResponse.json({ comments, page, perPage: PAGE_SIZE, hasMore: start + PAGE_SIZE < allComments.length, total: allComments.length });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  } catch {
    return NextResponse.json({ message: "دریافت دیدگاه‌های محصول ممکن نشد." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
