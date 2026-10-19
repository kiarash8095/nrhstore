import { authErrorResponseSchema,type AuthErrorCode } from "@/features/auth/contracts";

/** خطاهای سطح فیلد فرم: کلید = نام فیلد، مقدار = پیام قابل نمایش */
export type FieldErrors = Record<string, string>;

/** کدهای خطای سمت کلاینت = کدهای سرور + خطاهای شبکه‌ای */
export type AuthClientErrorCode = AuthErrorCode | "network_error";

/**
 * خطای یکنواخت سمت کلاینت.
 *
 * هر شکستی — از اعتبارسنجی سرور تا قطع شبکه — به این کلاس تبدیل می‌شود تا
 * فرم‌ها فقط یک شکل خطا بشناسند و منطق نمایش خطا در همه‌جا یکسان بماند.
 */
export class AuthClientError extends Error {
  readonly code: AuthClientErrorCode;
  readonly fields?: FieldErrors;
  readonly status?: number;
  /** برای خطاهای 429: ثانیه‌های باقی‌مانده تا تلاش مجدد */
  readonly retryAfter?: number;

  constructor(options: {
    code: AuthClientErrorCode;
    message: string;
    fields?: FieldErrors;
    status?: number;
    retryAfter?: number;
  }) {
    super(options.message);
    this.name = "AuthClientError";
    this.code = options.code;
    this.fields = options.fields;
    this.status = options.status;
    this.retryAfter = options.retryAfter;
  }
}

export function toAuthClientError(error: unknown): AuthClientError {
  if (error instanceof AuthClientError) return error;

  return new AuthClientError({
    code: "network_error",
    message:
      error instanceof Error && error.name === "AbortError"
        ? "درخواست لغو شد."
        : "ارتباط با سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید.",
  });
}

/**
 * پاسخ خطای BFF را به `AuthClientError` تبدیل می‌کند.
 * اگر پاسخ با قرارداد خطا نخواند (مثلاً یک صفحه‌ی HTML یا 502 پروکسی)،
 * خطای شبکه‌ای یکنواخت ساخته می‌شود تا UI در هر حالت چیزی برای نمایش داشته باشد.
 */
export function parseAuthErrorResponse(
  payload: unknown,
  status: number,
  retryAfter?: number,
): AuthClientError {
  const parsed = authErrorResponseSchema.safeParse(payload);

  if (!parsed.success) {
    return new AuthClientError({
      code: "network_error",
      status,
      retryAfter,
      message: "پاسخ سرور قابل خواندن نبود. لطفاً دوباره تلاش کنید.",
    });
  }

  return new AuthClientError({
    code: parsed.data.error.code,
    message: parsed.data.error.message,
    fields: parsed.data.error.fields,
    status,
    retryAfter,
  });
}
