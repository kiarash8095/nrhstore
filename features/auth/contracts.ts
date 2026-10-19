import { z } from "zod";

// The site's current Boom theme uses four SMS digits and six email recovery digits.
export const OTP_LENGTH = 4;
export const EMAIL_OTP_LENGTH = 6;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export function toAsciiDigits(input: string) {
  return input.replace(/[۰-۹٠-٩]/g, char => {
    const index = "۰۱۲۳۴۵۶۷۸۹".indexOf(char);
    return String(index === -1 ? "٠١٢٣٤٥٦٧٨٩".indexOf(char) : index);
  });
}

export function normalizeIranMobile(input: string) {
  let value = toAsciiDigits(input).replace(/[\s()-]/g, "");
  if (value.startsWith("+98")) value = value.slice(3);
  else if (value.startsWith("0098")) value = value.slice(4);
  else if (value.startsWith("98") && value.length === 12) value = value.slice(2);
  if (/^9\d{9}$/.test(value)) value = `0${value}`;
  return value;
}

export function maskIranMobile(input: string) {
  const phone = normalizeIranMobile(input);
  return /^09\d{9}$/.test(phone) ? `${phone.slice(0, 4)}***${phone.slice(7)}` : phone;
}

export const iranMobileSchema = z.string().trim().max(30).transform(normalizeIranMobile)
  .refine(value => /^09\d{9}$/.test(value), "شماره موبایل معتبر نیست.");

export const identifierSchema = z.string().trim().min(1, "شماره موبایل، ایمیل یا نام کاربری را وارد کنید.")
  .max(100).transform(value => /^09\d{9}$/.test(normalizeIranMobile(value)) ? normalizeIranMobile(value) : value)
  .refine(value => !/[\s\u0000-\u001f<>]/.test(value), "اطلاعات ورود معتبر نیست.");

const numericCode = (length: number) => z.string().trim().transform(toAsciiDigits)
  .refine(value => new RegExp(`^\\d{${length}}$`).test(value), `کد تایید باید ${length} رقم باشد.`);
export const otpCodeSchema = numericCode(OTP_LENGTH);
export const emailOtpCodeSchema = numericCode(EMAIL_OTP_LENGTH);

export const loginPasswordSchema = z.string().min(1, "رمز عبور را وارد کنید.").max(256);
export const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH, "رمز عبور باید حداقل ۸ کاراکتر باشد.")
  .max(PASSWORD_MAX_LENGTH, "رمز عبور بیش از حد طولانی است.");
export const personNameSchema = (label: string) => z.string().trim().min(2, `${label} را کامل وارد کنید.`).max(50);
export const emailSchema = z.string().trim().max(254).email("ایمیل معتبر نیست.");

export const authUserSchema = z.object({
  id: z.string().regex(/^[1-9]\d*$/),
  phone: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
});
export const authSessionSchema = z.object({ user: authUserSchema });
export const authResultSchema = z.object({ status: z.literal("authenticated"), session: authSessionSchema });
export const otpChallengeResponseSchema = z.object({
  ok: z.literal(true), resendAfter: z.number().int().positive(), expiresIn: z.number().int().positive(),
});
export const passwordResetResponseSchema = z.object({ status: z.literal("password-reset") });
export const logoutResponseSchema = z.object({ ok: z.literal(true) });
export const emailRecoveryResponseSchema = z.object({ ok: z.literal(true) });

export const authErrorCodeSchema = z.enum([
  "invalid_input", "phone_exists", "email_exists", "phone_not_found", "otp_invalid", "otp_expired",
  "otp_too_many_attempts", "rate_limited", "invalid_credentials", "account_disabled",
  "session_expired", "forbidden_origin", "backend_unavailable", "configuration_error", "unexpected_error",
]);
export const authErrorResponseSchema = z.object({
  error: z.object({ code: authErrorCodeSchema, message: z.string().min(1), fields: z.record(z.string(), z.string()).optional() }),
});
export const otpPurposeSchema = z.enum(["login", "recovery"]);
export const sendOtpRequestSchema = z.object({ phone: iranMobileSchema, purpose: otpPurposeSchema }).strict();
export const verifyOtpRequestSchema = z.object({ phone: iranMobileSchema, code: otpCodeSchema }).strict();
export const loginRequestSchema = z.object({ identifier: identifierSchema, password: loginPasswordSchema }).strict();
export const registerRequestSchema = z.object({
  phone: iranMobileSchema, email: emailSchema, firstName: personNameSchema("نام"),
  lastName: personNameSchema("نام خانوادگی"), password: passwordSchema,
}).strict();
export const resetPasswordRequestSchema = z.object({ phone: iranMobileSchema, code: otpCodeSchema, password: passwordSchema }).strict();
export const forgotPasswordEmailRequestSchema = z.object({ email: emailSchema }).strict();
export const resetPasswordEmailRequestSchema = z.object({ email: emailSchema, code: emailOtpCodeSchema, password: passwordSchema }).strict();

export type AuthUserDto = z.infer<typeof authUserSchema>;
export type AuthSessionDto = z.infer<typeof authSessionSchema>;
export type AuthResultDto = z.infer<typeof authResultSchema>;
export type OtpChallengeResponse = z.infer<typeof otpChallengeResponseSchema>;
export type PasswordResetResponse = z.infer<typeof passwordResetResponseSchema>;
export type AuthErrorCode = z.infer<typeof authErrorCodeSchema>;
export type AuthErrorResponse = z.infer<typeof authErrorResponseSchema>;
export type OtpPurpose = z.infer<typeof otpPurposeSchema>;
export type SendOtpRequest = z.infer<typeof sendOtpRequestSchema>;
export type VerifyOtpRequest = z.infer<typeof verifyOtpRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type ForgotPasswordEmailRequest = z.infer<typeof forgotPasswordEmailRequestSchema>;
export type ResetPasswordEmailRequest = z.infer<typeof resetPasswordEmailRequestSchema>;

// Client navigation destinations must stay on this site.
export function safeAuthNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return null;
  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid") return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}
