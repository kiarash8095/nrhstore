import "server-only";

import { consumeRateLimit } from "@/lib/server/rate-limit";
import { isTrustedOriginRequest } from "@/lib/http/request-origin";
import { NextResponse,type NextRequest } from "next/server";
import type { z } from "zod";
import { authErrorResponseSchema,type AuthErrorCode } from "../contracts";
import { getAuthConfig } from "./config";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export function jsonAuthError(code: AuthErrorCode, message: string, status: number, fields?: Record<string, string>) {
  return jsonOk(authErrorResponseSchema.parse({ error: { code, message, ...(fields ? { fields } : {}) } }), { status });
}

export function tooManyRequests(retryAfter: number, message = "تلاش‌های شما بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.") {
  const response = jsonAuthError("rate_limited", message, 429);
  response.headers.set("Retry-After", String(retryAfter));
  return response;
}

export async function readJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<
  { ok: true; data: T } | { ok: false; response: NextResponse }
> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return { ok: false, response: jsonAuthError("invalid_input", "فرمت درخواست معتبر نیست.", 415) };
  }
  const reader = request.body?.getReader();
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    if (!reader) throw new Error("Missing JSON body");
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > 8192) {
        await reader.cancel();
        return { ok: false, response: jsonAuthError("invalid_input", "درخواست بیش از حد بزرگ است.", 413) };
      }
      chunks.push(chunk.value);
    }
    const input: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join(".")] ||= issue.message;
      return { ok: false, response: jsonAuthError("invalid_input", parsed.error.issues[0].message, 400, fields) };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, response: jsonAuthError("invalid_input", "درخواست نامعتبر است.", 400) };
  } finally { reader?.releaseLock(); }
}

export function isSameOriginRequest(request: NextRequest) {
  return isTrustedOriginRequest(request, getAuthConfig().allowedOrigins);
}

export function forbiddenOrigin() {
  return jsonAuthError("forbidden_origin", "درخواست از مبدأ معتبر ارسال نشده است.", 403);
}

export function getClientIp(request: NextRequest) {
  // Deployment proxies must overwrite forwarding headers; also limit by account.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function limitAuthRequest(request: NextRequest, scope: string, identity: string, limit: number, windowMs: number) {
  const ip = consumeRateLimit(`${scope}:ip:${getClientIp(request)}`, limit * 4, windowMs);
  const account = consumeRateLimit(`${scope}:account:${identity}`, limit, windowMs);
  if (!ip.allowed || !account.allowed) return tooManyRequests(Math.max(ip.retryAfter, account.retryAfter));
  return null;
}
