import {
authResultSchema,
emailRecoveryResponseSchema,
logoutResponseSchema,
otpChallengeResponseSchema,
passwordResetResponseSchema,
type ForgotPasswordEmailRequest,
type LoginRequest,
type RegisterRequest,
type ResetPasswordEmailRequest,
type ResetPasswordRequest,
type SendOtpRequest,
type VerifyOtpRequest,
} from "@/features/auth/contracts";
import type { z } from "zod";
import { withStoreSessionLock } from '@/lib/http/store-session-lock';

import type { AuthSession } from "../types/auth-user.types";
import {
AuthClientError,
parseAuthErrorResponse,
} from "./auth.error";

/**
 * کلاینت API احراز هویت (فقط لایه‌ی انتقال).
 *
 * - بدون React، بدون store، بدون منطق تجاری؛ فقط درخواست و اعتبارسنجی پاسخ.
 * - هر پاسخ با اسکیمای zod قرارداد اعتبارسنجی می‌شود؛ اگر BFF و کلاینت از هم
 *   واگرا شوند، خطا همین‌جا و با پیام روشن گرفته می‌شود، نه در وسط رندر UI.
 * - خطاها همیشه `AuthClientError` هستند.
 */

const AUTH_BASE = "/api/auth";

interface RequestOptions<T> {
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  schema: z.ZodType<T>;
  signal?: AbortSignal;
}

async function requestUnlocked<T>({
  path,
  method = "POST",
  body,
  schema,
  signal,
}: RequestOptions<T>): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${AUTH_BASE}${path}`, {
      method,
      // کوکی httpOnly نشست فقط باید برای همین مبدأ ارسال شود
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45_000)]) : AbortSignal.timeout(45_000),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;

    throw new AuthClientError({
      code: "network_error",
      message: "ارتباط با سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید.",
    });
  }

  const retryAfterHeader = response.headers.get("Retry-After");
  const retryAfter = retryAfterHeader
    ? Number.parseInt(retryAfterHeader, 10) || undefined
    : undefined;

  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw parseAuthErrorResponse(payload, response.status, retryAfter);
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    // ناسازگاری قرارداد بین BFF و کلاینت؛ در محیط توسعه جزئیات را چاپ می‌کنیم.
    if (process.env.NODE_ENV !== "production") {
      console.error(`[auth-api] پاسخ ${path} با قرارداد نمی‌خواند`, parsed.error);
    }

    throw new AuthClientError({
      code: "network_error",
      status: response.status,
      message: "پاسخ سرور با قرارداد مورد انتظار مطابقت ندارد.",
    });
  }

  return parsed.data;
}

function request<T>(options: RequestOptions<T>): Promise<T> {
  // Session reads are read-only on the BFF and need not delay a newer login.
  if (options.method === 'GET') return requestUnlocked(options);
  return withStoreSessionLock(() => requestUnlocked(options), options.signal);
}

export const authApi = {
  async sendOtp(input: SendOtpRequest, signal?: AbortSignal) {
    return request({
      path: "/send-otp",
      body: input,
      schema: otpChallengeResponseSchema,
      signal,
    });
  },

  /** ورود پیامکی؛ بازیابی رمز مستقیماً کد را به reset-password می‌فرستد. */
  async verifyOtp(input: VerifyOtpRequest, signal?: AbortSignal) {
    return request({
      path: "/verify-otp",
      body: input,
      schema: authResultSchema,
      signal,
    });
  },

  async login(input: LoginRequest, signal?: AbortSignal): Promise<AuthSession> {
    const data = await request({
      path: "/login",
      body: input,
      schema: authResultSchema,
      signal,
    });

    return data.session;
  },

  async register(input: RegisterRequest, signal?: AbortSignal): Promise<AuthSession> {
    const data = await request({
      path: "/register",
      body: input,
      schema: authResultSchema,
      signal,
    });

    return data.session;
  },

  async resetPassword(input: ResetPasswordRequest, signal?: AbortSignal) {
    return request({
      path: "/reset-password",
      body: input,
      schema: passwordResetResponseSchema,
      signal,
    });
  },

  async forgotPasswordEmail(input: ForgotPasswordEmailRequest, signal?: AbortSignal) {
    return request({
      path: "/forgot-password-email",
      body: input,
      schema: emailRecoveryResponseSchema,
      signal,
    });
  },

  async resetPasswordEmail(input: ResetPasswordEmailRequest, signal?: AbortSignal) {
    return request({
      path: "/reset-password-email",
      body: input,
      schema: passwordResetResponseSchema,
      signal,
    });
  },

  /** خواندن نشست فعلی از کوکی httpOnly؛ `null` یعنی کاربر مهمان است */
  async getSession(signal?: AbortSignal): Promise<AuthSession | null> {
    try {
      const data = await request({
        path: "/session",
        method: "GET",
        schema: authResultSchema,
        signal,
      });

      return data.session;
    } catch (error) {
      if (error instanceof AuthClientError && error.code === "session_expired") {
        return null;
      }

      throw error;
    }
  },

  async logout(signal?: AbortSignal): Promise<void> {
    await request({
      path: "/logout",
      schema: logoutResponseSchema,
      signal,
    });
  },
};
