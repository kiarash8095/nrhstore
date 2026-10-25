import { NextRequest, NextResponse } from "next/server";
import { submitProductReview } from "@/features/product_comment/api/comments.service";
import { getOrCreateReviewRequest, readReviewIdempotencyKey } from "@/features/product_comment/api/review-idempotency";
import { productReviewInputSchema } from "@/features/product_comment/schemas/comments.types";
import { getCartAuthContext } from "@/features/auth/server";
import { forbiddenOrigin, getClientIp, isSameOriginRequest, readJsonBody } from "@/features/auth/server/http";
import { consumeRateLimit } from "@/lib/server/rate-limit";

interface ReviewRouteResult {
  status: number;
  body: Record<string, unknown>;
  retryAfter?: number;
  cacheable: boolean;
}

function responseFor(result: ReviewRouteResult, replayed = false) {
  const response = NextResponse.json(result.body, { status: result.status });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  if (result.retryAfter) response.headers.set("Retry-After", String(result.retryAfter));
  if (replayed) response.headers.set("Idempotency-Replayed", "true");
  return response;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return forbiddenOrigin();

  let authContext: Awaited<ReturnType<typeof getCartAuthContext>>;
  try {
    authContext = await getCartAuthContext(request);
  } catch {
    return NextResponse.json({ error: { code: "auth_unavailable", message: "احراز هویت در حال حاضر در دسترس نیست. دوباره تلاش کنید." } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!authContext) {
    return NextResponse.json({ error: { code: "login_required", message: "برای ثبت دیدگاه ابتدا وارد حساب کاربری شوید." } }, { status: 401, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }

  const idempotencyKey = readReviewIdempotencyKey(request);
  if (idempotencyKey === false) {
    return NextResponse.json({ error: { code: "invalid_input", message: "شناسهٔ تکرارنشدن درخواست معتبر نیست." } }, { status: 400 });
  }

  const parsed = await readJsonBody(request, productReviewInputSchema);
  if (!parsed.ok) return parsed.response;

  const run = async (): Promise<ReviewRouteResult> => {
    const limit = consumeRateLimit(`product-review:${getClientIp(request)}`, 5, 10 * 60_000);
    if (!limit.allowed) {
      return {
        status: 429,
        body: { error: { code: "rate_limited", message: "تعداد تلاش‌ها بیش از حد مجاز است. کمی بعد دوباره امتحان کنید." } },
        retryAfter: limit.retryAfter,
        cacheable: false,
      };
    }

    try {
      const result = await submitProductReview(parsed.data);
      return { status: 200, body: { ok: true, status: "pending", message: result.message }, cacheable: true };
    } catch {
      return { status: 502, body: { error: { code: "backend_unavailable", message: "ثبت دیدگاه در حال حاضر ممکن نیست. دوباره تلاش کنید." } }, cacheable: false };
    }
  };

  if (!idempotencyKey) return responseFor(await run());

  const operation = getOrCreateReviewRequest(`${authContext.userId}:${idempotencyKey}`, JSON.stringify(parsed.data), run, result => result.cacheable);
  if (operation.kind === "conflict") {
    return NextResponse.json({ error: { code: "idempotency_conflict", message: "این شناسه قبلاً برای دیدگاه دیگری استفاده شده است." } }, { status: 409 });
  }

  const result = await operation.promise!;
  return responseFor(result, operation.kind === "replay");
}
