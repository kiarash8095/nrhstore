import {
emailOtpCodeSchema,
emailSchema,
identifierSchema,iranMobileSchema,
loginPasswordSchema,
otpCodeSchema,
passwordSchema,personNameSchema,
} from "@/features/auth/contracts";
import { z } from "zod";
import type { RecoveryChannel } from "../types/auth-flow.types";

export const phoneFormSchema = z.object({ identifier: identifierSchema });
export const passwordFormSchema = z.object({ password: loginPasswordSchema });
export const otpFormSchema = z.object({ code: otpCodeSchema });

const newPasswordFields = {
  password: passwordSchema,
  confirmPassword: z.string().min(1, "تکرار رمز عبور را وارد کنید."),
};
const passwordsMatch = (value: { password: string; confirmPassword: string }) => value.password === value.confirmPassword;
const mismatch = { path: ["confirmPassword"], message: "رمزهای واردشده یکسان نیستند." };

export const registerFormSchema = z.object({
  firstName: personNameSchema("نام"), lastName: personNameSchema("نام خانوادگی"),
  phone: iranMobileSchema, email: emailSchema, ...newPasswordFields,
}).refine(passwordsMatch, mismatch);

export const resetPasswordFormSchema = (channel: RecoveryChannel) => z.object({
  code: channel === "sms" ? otpCodeSchema : emailOtpCodeSchema, ...newPasswordFields,
}).refine(passwordsMatch, mismatch);

export const recoveryFormSchema = z.object({
  channel: z.enum(["sms", "email"]),
  destination: z.string().min(1, "شماره موبایل یا ایمیل را وارد کنید."),
}).superRefine((value, context) => {
  const parsed = (value.channel === "sms" ? iranMobileSchema : emailSchema).safeParse(value.destination);
  if (!parsed.success) context.addIssue({ code: "custom", path: ["destination"], message: parsed.error.issues[0].message });
}).transform(value => ({
  ...value,
  destination: value.channel === "sms" ? iranMobileSchema.parse(value.destination) : emailSchema.parse(value.destination),
}));

export type PhoneFormValues = z.input<typeof phoneFormSchema>;
export type PasswordFormValues = z.input<typeof passwordFormSchema>;
export type OtpFormValues = z.input<typeof otpFormSchema>;
export type RegisterFormValues = z.output<typeof registerFormSchema>;
export type ResetPasswordFormValues = z.output<ReturnType<typeof resetPasswordFormSchema>>;
export type RecoveryFormValues = z.output<typeof recoveryFormSchema>;
