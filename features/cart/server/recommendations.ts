import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { wcFetch } from "@/lib/woocommerce/store-client";
import type { Products } from "@/features/products";
import { consumeRateLimit } from "@/lib/server/rate-limit";

export async function recommendationsHandler(request: NextRequest) {
  const limit = consumeRateLimit(
    "cart-recommendations:" +
      (request.headers.get("x-forwarded-for") || "unknown"),
    120,
    60_000,
  );
  if (!limit.allowed)
    return NextResponse.json(
      { message: "کمی بعد دوباره تلاش کنید." },
      { status: 429 },
    );
  const input = request.nextUrl.searchParams.get("ids") || "";
  if (!/^[1-9]\d{0,9}(,[1-9]\d{0,9}){0,7}$/.test(input))
    return NextResponse.json(
      { message: "شناسه‌ها معتبر نیستند." },
      { status: 400 },
    );
  const ids = [...new Set(input.split(",").map(Number))];
  try {
    const seed = await wcFetch<Products>("/products/" + ids[0]);
    const related = await wcFetch<Products[]>(
      "/products?related=" + (seed.parent || seed.id) + "&per_page=12",
    );
    const products = Array.isArray(related)
      ? related
          .filter((item) => !ids.includes(item.id) && item.is_in_stock)
          .slice(0, 6)
      : [];
    return NextResponse.json(products, {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=60" },
    });
  } catch {
    return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });
  }
}
