"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller,useForm } from "react-hook-form";
import { FaSms } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import {
Field,
FieldDescription,
FieldError,
FieldGroup,
FieldLabel,
} from "@/components/ui/field";
import {
InputOTP,
InputOTPGroup,
InputOTPSlot,
} from "@/components/ui/input-otp";
import { OTP_LENGTH,toAsciiDigits } from "@/features/auth/contracts";

import { useAuthActions } from "../../hooks/use-auth-actions";
import { useAuthFlow } from "../../hooks/use-auth-flow";
import { useCountdown } from "../../hooks/use-countdown";
import { otpFormSchema,type OtpFormValues } from "../../schemas/auth-validation";
import { applyAuthError,maskIranMobile } from "../../utils/auth-helpers";

/**
 * ورود با کد پیامکی؛ بازیابی رمز فرم مستقلی دارد و کد را فقط یک‌بار مصرف می‌کند.
 */
export function OtpForm() {
  const { verifyOtp, resendOtp } = useAuthActions();
  const { phone, isBusy, resendAvailableAt } = useAuthFlow();
  const remaining = useCountdown(resendAvailableAt);

  const form = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { code: "" },
    // اعتبارسنجی فقط هنگام ارسال فرم؛ خطای قرمز پیش از فشردن دکمه دیده نمی‌شود
    mode: "onSubmit",
  });

  const isSubmitting = form.formState.isSubmitting;
  const disabled = isSubmitting || isBusy;

  async function onSubmit(values: OtpFormValues) {
    try {
      await verifyOtp(values.code);
    } catch (error) {
      // اول پاک‌سازی، بعد نشاندن خطا؛ reset خطا را هم پاک می‌کند
      form.resetField("code");
      applyAuthError(form, error, "code");
    }
  }

  async function handleResend() {
    try {
      await resendOtp();
      form.resetField("code");
    } catch (error) {
      form.resetField("code");
      applyAuthError(form, error, "code");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field>
          <FieldDescription className="text-xs leading-relaxed">
            کد {OTP_LENGTH} رقمی به شماره{" "}
            <span className="font-medium text-gray-700" dir="ltr">
              {maskIranMobile(phone)}
            </span>{" "}
            ارسال شد.
          </FieldDescription>
        </Field>

        <Controller
          name="code"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="items-center">
              <FieldLabel htmlFor="auth-otp" className="sr-only">
                کد تایید
              </FieldLabel>

              <InputOTP
                {...field}
                id="auth-otp"
                maxLength={OTP_LENGTH}
                pattern="^[0-9۰-۹٠-٩]*$"
                pasteTransformer={toAsciiDigits}
                dir="ltr"
                disabled={disabled}
                autoFocus
                aria-invalid={fieldState.invalid}
                containerClassName="justify-center"
                onChange={(value) => {
                  const code = toAsciiDigits(value);
                  field.onChange(code);

                  // ارسال خودکار وقتی همه‌ی ارقام وارد شد
                  if (code.length === OTP_LENGTH) void form.handleSubmit(onSubmit)();
                }}
              >
                <InputOTPGroup dir="ltr" className="gap-2 [&_[data-slot=input-otp-slot]]:h-12 [&_[data-slot=input-otp-slot]]:w-11 [&_[data-slot=input-otp-slot]]:rounded-xl [&_[data-slot=input-otp-slot]]:border [&_[data-slot=input-otp-slot]]:border-gray-200 [&_[data-slot=input-otp-slot]]:bg-gray-50/70 [&_[data-slot=input-otp-slot]]:text-base">
                  {Array.from({ length: OTP_LENGTH }, (_, index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} className="text-center" />
              )}
            </Field>
          )}
        />

        {form.formState.errors.root && (
          <FieldError errors={[form.formState.errors.root]} />
        )}

        <Button
          type="submit"
          disabled={disabled}
          className="h-12 w-full rounded-xl text-sm font-medium"
        >
          {isSubmitting ? "در حال بررسی…" : "تایید کد"}
        </Button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
          <FaSms className="size-3.5 text-gray-400" />
          {remaining > 0 ? (
            <span>
              ارسال مجدد تا{" "}
              <span className="inline-block min-w-6 text-center font-medium text-orange-500">
                {remaining}
              </span>{" "}
              ثانیه دیگر
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={disabled}
              className="font-medium text-orange-500 transition hover:text-orange-600 disabled:opacity-50"
            >
              ارسال مجدد کد
            </button>
          )}
        </div>
      </FieldGroup>
    </form>
  );
}
