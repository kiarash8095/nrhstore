import { NextResponse,type NextRequest } from "next/server";
import "server-only";
import type { z } from "zod";

import { consumeRateLimit } from "@/lib/server/rate-limit";
import { ConfigurationError, getAuthSessionSecret } from "@/lib/server/runtime-config.cjs";
import type { AuthResultDto } from "../contracts";
import { AUTH_ERROR_MESSAGES,AuthBackendError } from "./backend/errors";
import { applyJar,type CookieJar } from "./cookies";
import {
forbiddenOrigin,
getClientIp,
isSameOriginRequest,
jsonAuthError,
jsonOk,
readJsonBody,
tooManyRequests,
} from "./http";

/**
 * مرز امنیتی BFF.
 *
 * هر Route Handler احراز هویت از این wrapper استفاده می‌کند تا سه کار به‌صورت
 * یکنواخت و نشتی‌ناپذیر انجام شود:
 *   1. بررسی هم‌مبدأ بودن درخواست (لایه‌ی دفاعی CSRF)
 *   2. اعتبارسنجی بدنه با zod پیش از رسیدن به منطق تجاری
 *   3. نگاشت خطاها به پاسخ فارسی امن (بدون لو دادن پیام خام وردپرس)
 */
export function toErrorResponse(error: unknown, context: string): NextResponse {
  if (error instanceof ConfigurationError) {
    console.error(`[auth:${context}] Configuration error:`, error.message);
    return jsonAuthError("configuration_error", AUTH_ERROR_MESSAGES.configuration_error, 503);
  }
  if (error instanceof AuthBackendError) {
    // خطای ۵xx وردپرس برای ما «در دسترس نبودن» است، نه پیام خام
    if (error.status >= 500) {
      console.error(`[auth:${context}]`, error.code);
      return jsonAuthError("backend_unavailable", error.message, error.status);
    }

    return jsonAuthError(error.code, error.message, error.status, error.fields);
  }

  console.error(`[auth:${context}] خطای غیرمنتظره:`, error);

  return jsonAuthError(
    "unexpected_error",
    AUTH_ERROR_MESSAGES.unexpected_error,
    500,
  );
}

export function authRoute<T>(options: {
  /** برچسب لاگ؛ هم‌نام endpoint */
  context: string;
  schema: z.ZodType<T>;
  handler: (input: T, request: NextRequest) => Promise<NextResponse>;
}): (request: NextRequest) => Promise<NextResponse> {
  return async function handleAuthRoute(request: NextRequest) {
    if (!isSameOriginRequest(request)) return forbiddenOrigin();
    const trafficLimit = authTrafficLimit(request);
    if (trafficLimit) return trafficLimit;

    const body = await readJsonBody(request, options.schema);
    if (!body.ok) return body.response;

    try {
      getAuthSessionSecret();
      return await options.handler(body.data, request);
    } catch (error) {
      return toErrorResponse(error, options.context);
    }
  };
}

/** همان مرز امنیتی برای endpoint هایی که بدنه ندارند و فقط کوکی می‌خوانند */
export function authCookieRoute(options: {
  context: string;
  handler: (request: NextRequest) => Promise<NextResponse>;
}): (request: NextRequest) => Promise<NextResponse> {
  return async function handleAuthCookieRoute(request: NextRequest) {
    if (!isSameOriginRequest(request)) return forbiddenOrigin();
    const trafficLimit = authTrafficLimit(request);
    if (trafficLimit) return trafficLimit;

    try {
      getAuthSessionSecret();
      return await options.handler(request);
    } catch (error) {
      return toErrorResponse(error, options.context);
    }
  };
}

function authTrafficLimit(request: NextRequest) {
  const global = consumeRateLimit("auth:global", 2000, 60_000);
  if (!global.allowed) return tooManyRequests(global.retryAfter);
  const ip = consumeRateLimit(`auth:ip:${getClientIp(request)}`, 100, 60_000);
  return ip.allowed ? null : tooManyRequests(ip.retryAfter);
}

/**
 * پاسخ موفق «ورود/ثبت‌نام/تایید کد»: بدنه فقط کاربر را دارد و سبد کوکی نشست
 * (کوکی‌های وردپرس) به‌صورت کوکی httpOnly روی همان پاسخ ست می‌شود.
 * نشست هرگز به جاوااسکریپت مرورگر نمی‌رسد.
 */
export function authenticatedResponse(result: {
  user: AuthResultDto["session"]["user"];
  jar: CookieJar;
}): NextResponse {
  const response = jsonOk({
    status: "authenticated",
    session: { user: result.user },
  } satisfies AuthResultDto);

  return applyJar(response, result.jar);
}
