import type { AuthErrorCode } from "../../contracts";

/**
 * خطای لایه‌ی بک‌اند.
 *
 * پیام خام وردپرس به مرورگر یا لاگ‌ها منتقل نمی‌شود.
 * کد یکنواخت `AuthErrorCode` به UI می‌رسد تا رفتار برنامه‌ریزی‌پذیر بماند.
 */
export class AuthBackendError extends Error {
  readonly code: AuthErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(options: {
    code: AuthErrorCode;
    status: number;
    message: string;
    fields?: Record<string, string>;
  }) {
    super(options.message);
    this.name = "AuthBackendError";
    this.code = options.code;
    this.status = options.status;
    this.fields = options.fields;
  }
}

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_input: "اطلاعات وارد‌شده نامعتبر است.",
  phone_exists: "این شماره قبلاً ثبت شده است.",
  email_exists: "این ایمیل قبلاً ثبت شده است.",
  phone_not_found: "شماره‌ای با این مشخصات پیدا نشد.",
  otp_invalid: "کد تایید نادرست یا منقضی شده است.",
  otp_expired: "کد تایید منقضی شده است. دوباره درخواست کنید.",
  otp_too_many_attempts: "تعداد تلاش‌های نادرست زیاد بود. کد جدید بگیرید.",
  rate_limited: "درخواست‌های شما زیاد بوده است. کمی بعد دوباره تلاش کنید.",
  invalid_credentials: "اطلاعات ورود یا رمز عبور نادرست است.",
  account_disabled: "این حساب کاربری غیرفعال شده است. با پشتیبانی تماس بگیرید.",
  session_expired: "نشست شما منقضی شده است. دوباره وارد شوید.",
  forbidden_origin: "درخواست از مبدأ معتبر ارسال نشده است.",
  backend_unavailable:
    "ارتباط با سرور برقرار نشد. لطفاً چند لحظه بعد دوباره تلاش کنید.",
  configuration_error: "تنظیمات سرویس ورود کامل نیست. لطفاً با پشتیبانی تماس بگیرید.",
  unexpected_error: "خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش کنید.",
};

/** وضعیت HTTP پیش‌فرض هر کد خطا */
const STATUS_BY_CODE: Record<AuthErrorCode, number> = {
  invalid_input: 400,
  phone_exists: 409,
  email_exists: 409,
  phone_not_found: 404,
  otp_invalid: 400,
  otp_expired: 410,
  otp_too_many_attempts: 429,
  rate_limited: 429,
  invalid_credentials: 401,
  account_disabled: 403,
  session_expired: 401,
  forbidden_origin: 403,
  backend_unavailable: 503,
  configuration_error: 503,
  unexpected_error: 500,
};

export function authError(
  code: AuthErrorCode,
  options?: {
    status?: number;
    message?: string;
    fields?: Record<string, string>;
  },
): AuthBackendError {
  return new AuthBackendError({
    code,
    status: options?.status ?? STATUS_BY_CODE[code],
    message: options?.message ?? AUTH_ERROR_MESSAGES[code],
    fields: options?.fields,
  });
}

/** الگوهای کد/پیام خطای پلاگین → کد داخلی ما */
const ERROR_PATTERNS: Array<{ keywords: string[]; code: AuthErrorCode }> = [
  { keywords: ["کد اشتباه است یا منقضی شده"], code: "otp_invalid" },
  { keywords: ["email_exists", "ایمیل قبلاً", "ایمیل وجود دارد", "ایمیل قبلا"], code: "email_exists" },
  { keywords: ["incorrect_password", "invalid_credentials", "wrong_password", "رمز عبور اشتباه", "نام کاربری یا رمز عبور اشتباه"], code: "invalid_credentials" },
  { keywords: ["phone_exists", "user_exists", "email_exists", "duplicate", "قبلاً ثبت"], code: "phone_exists" },
  { keywords: ["phone_not_found", "user_not_found", "email_not_found", "invalid_email", "no_user", "پیدا نشد", "یافت نشد"], code: "phone_not_found" },
  { keywords: ["otp_expired", "code_expired", "token_expired", "منقضی"], code: "otp_expired" },
  { keywords: ["otp_invalid", "invalid_otp", "invalid_code", "wrong_otp", "کد اشتباه", "کد صحیح نمی"], code: "otp_invalid" },
  { keywords: ["too_many_attempts", "rate_limit", "too_many_requests", "flood", "زیاد"], code: "rate_limited" },
  { keywords: ["user_disabled", "account_disabled", "deactivated", "غیرفعال"], code: "account_disabled" },
  { keywords: ["invalid_token", "expired_token", "not_logged_in", "session_expired", "unauthorized", "لاگین نیست"], code: "session_expired" },
];

/** کد خطا را از روی پیام/کد بک‌اند و در نهایت از روی وضعیت HTTP حدس می‌زند */
export function mapBackendErrorCode(
  rawCode: string | undefined,
  rawMessage: string | undefined,
  status: number,
): AuthErrorCode {
  const haystack = `${rawCode ?? ""} ${rawMessage ?? ""}`.toLowerCase();
  const found = ERROR_PATTERNS.find((pattern) =>
    pattern.keywords.some((keyword) => haystack.includes(keyword.toLowerCase())),
  );
  if (found) return found.code;

  if (status === 400 || status === 422) return "invalid_input";
  if (status === 401) return "invalid_credentials";
  if (status === 403) return "otp_invalid";
  if (status === 404) return "phone_not_found";
  if (status === 409) return "phone_exists";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "backend_unavailable";

  return "unexpected_error";
}
