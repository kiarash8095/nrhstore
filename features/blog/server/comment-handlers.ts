import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getCartAuthContext } from "@/features/auth/server";
import { isTrustedOriginRequest } from "@/lib/http/request-origin";
import { boundedJson } from "@/lib/http/bounded-json";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { blogCommentInputSchema } from "../contracts";
import { getBlogComments, submitBlogComment } from "./comments";
import { BlogApiError } from "./transport";

type Context = { params: Promise<{ postId: string }> };
type Result = { status: number; body: unknown };
const pending = new Map<
  string,
  { fingerprint: string; promise: Promise<Result>; expires: number }
>();
function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
function fail(message: string, status: number, code = "blog_unavailable") {
  return json({ error: { code, message } }, status);
}
function postIdFrom(value: string) {
  return /^[1-9]\d{0,9}$/.test(value) ? Number(value) : null;
}

export async function GET(request: NextRequest, context: Context) {
  const id = postIdFrom((await context.params).postId);
  const page = request.nextUrl.searchParams.get("page") || "1";
  if (!id || !/^[1-9]\d{0,4}$/.test(page))
    return fail("درخواست معتبر نیست.", 400, "invalid_input");
  try {
    return json(await getBlogComments(id, Number(page)));
  } catch {
    return fail("دریافت دیدگاه‌ها انجام نشد. دوباره تلاش کنید.", 502);
  }
}

function errorResult(error: unknown): Result {
  const code = error instanceof BlogApiError ? error.code : "";
  if (
    ["rest_comment_login_required", "rest_cookie_invalid_nonce"].includes(code)
  )
    return {
      status: 401,
      body: {
        error: {
          code: "login_required",
          message: "نشست شما نیاز به بررسی دارد. دوباره وارد شوید.",
        },
      },
    };
  if (["comments_closed", "rest_comment_closed"].includes(code))
    return {
      status: 403,
      body: {
        error: {
          code: "comments_closed",
          message: "امکان ثبت دیدگاه برای این مقاله بسته است.",
        },
      },
    };
  if (["comment_duplicate", "rest_comment_duplicate"].includes(code))
    return {
      status: 409,
      body: {
        error: { code: "duplicate", message: "این دیدگاه قبلاً ثبت شده است." },
      },
    };
  if (/flood/.test(code))
    return {
      status: 429,
      body: {
        error: {
          code: "rate_limited",
          message: "لطفاً کمی بعد دیدگاه جدید ثبت کنید.",
        },
      },
    };
  return {
    status: 502,
    body: {
      error: {
        code: "blog_unavailable",
        message:
          "تأیید ثبت دیدگاه ممکن نشد. پیش از ارسال دوباره، فهرست دیدگاه‌ها را بررسی کنید.",
      },
    },
  };
}

export async function POST(request: NextRequest, context: Context) {
  const origins = (process.env.AUTH_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!isTrustedOriginRequest(request, origins))
    return fail("مبدأ درخواست معتبر نیست.", 403, "forbidden_origin");
  const id = postIdFrom((await context.params).postId);
  if (!id) return fail("مقاله معتبر نیست.", 400, "invalid_input");
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const traffic = consumeRateLimit(`blog-comments:ip:${ip}`, 20, 10 * 60_000);
  if (!traffic.allowed) {
    const response = fail(
      "درخواست‌های شما زیاد بوده است. کمی بعد تلاش کنید.",
      429,
      "rate_limited",
    );
    response.headers.set("Retry-After", String(traffic.retryAfter));
    return response;
  }
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    return fail("فرمت درخواست معتبر نیست.", 415, "invalid_input");
  let input;
  try {
    input = blogCommentInputSchema.safeParse(
      await boundedJson(new Response(request.body), 16 * 1024),
    );
  } catch {
    return fail(
      "متن دیدگاه نامعتبر یا بیش از حد بزرگ است.",
      400,
      "invalid_input",
    );
  }
  if (!input.success)
    return fail(input.error.issues[0].message, 400, "invalid_input");
  const key = request.headers.get("idempotency-key") || "";
  if (!/^[0-9a-f-]{36}$/i.test(key))
    return fail("شناسه درخواست معتبر نیست.", 400, "invalid_input");
  let auth;
  try {
    auth = await getCartAuthContext(request);
  } catch {
    return fail(
      "بررسی نشست ممکن نشد. کمی بعد تلاش کنید.",
      503,
      "auth_unavailable",
    );
  }
  if (!auth)
    return fail("برای ثبت دیدگاه ابتدا وارد حساب شوید.", 401, "login_required");
  const now = Date.now();
  for (const [entryKey, entry] of pending)
    if (entry.expires <= now) pending.delete(entryKey);
  const entryKey = `${auth.userId}:${id}:${key}`;
  const fingerprint = createHash("sha256")
    .update(input.data.content)
    .digest("hex");
  const existing = pending.get(entryKey);
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      return fail(
        "شناسه درخواست برای متن دیگری استفاده شده است.",
        409,
        "idempotency_conflict",
      );
    const result = await existing.promise;
    return json(result.body, result.status);
  }
  const limit = consumeRateLimit(
    `blog-comments:user:${auth.userId}`,
    5,
    10 * 60_000,
  );
  if (!limit.allowed) {
    const response = fail(
      "حداکثر پنج دیدگاه در ده دقیقه مجاز است.",
      429,
      "rate_limited",
    );
    response.headers.set("Retry-After", String(limit.retryAfter));
    return response;
  }
  // Coalesce in-flight submissions before any upstream write. No automatic retry of POST.
  const promise: Promise<Result> = submitBlogComment(
    id,
    input.data.content,
    auth,
  )
    .then((body) => ({ status: 201, body }))
    .catch(errorResult);
  pending.set(entryKey, { fingerprint, promise, expires: now + 10 * 60_000 });
  if (pending.size > 1000) pending.delete(pending.keys().next().value!);
  const result = await promise;
  return json(result.body, result.status);
}
