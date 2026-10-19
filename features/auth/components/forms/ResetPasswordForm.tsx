"use client";

import { Button } from "@/components/ui/button";
import { Field,FieldDescription,FieldError,FieldGroup,FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EMAIL_OTP_LENGTH,OTP_LENGTH,toAsciiDigits } from "@/features/auth/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller,useForm } from "react-hook-form";
import { useAuthActions } from "../../hooks/use-auth-actions";
import { useAuthFlow } from "../../hooks/use-auth-flow";
import { useCountdown } from "../../hooks/use-countdown";
import { resetPasswordFormSchema,type ResetPasswordFormValues } from "../../schemas/auth-validation";
import { applyAuthError,maskIranMobile } from "../../utils/auth-helpers";
import { PasswordInput } from "./PasswordInput";

export function ResetPasswordForm() {
  const { submitPasswordReset, resendOtp } = useAuthActions();
  const { phone, email, recoveryChannel, isBusy, resendAvailableAt } = useAuthFlow();
  const remaining = useCountdown(resendAvailableAt);
  const length = recoveryChannel === "sms" ? OTP_LENGTH : EMAIL_OTP_LENGTH;
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema(recoveryChannel)),
    defaultValues: { code: "", password: "", confirmPassword: "" },
  });
  const disabled = isBusy || form.formState.isSubmitting;
  async function submit(values: ResetPasswordFormValues) {
    try { await submitPasswordReset(values); }
    catch (error) { applyAuthError(form, error); }
  }
  async function resend() {
    try { await resendOtp(); }
    catch (error) { applyAuthError(form, error); }
  }
  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <FieldDescription dir="ltr" className="text-xs">{recoveryChannel === "sms" ? maskIranMobile(phone) : email}</FieldDescription>
        <Controller name="code" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="auth-recovery-code">کد بازیابی {length} رقمی</FieldLabel>
            <Input {...field} id="auth-recovery-code" dir="ltr" inputMode="numeric" autoComplete="one-time-code"
              maxLength={length} disabled={disabled} aria-invalid={fieldState.invalid}
              onChange={event => field.onChange(toAsciiDigits(event.target.value))}
              className="h-12 rounded-xl border-gray-200 bg-gray-50/70 text-center text-sm tracking-widest" />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />
        {(["password", "confirmPassword"] as const).map(name => (
          <Controller key={name} name={name} control={form.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`auth-reset-${name}`}>{name === "password" ? "رمز عبور جدید" : "تکرار رمز عبور جدید"}</FieldLabel>
              <PasswordInput {...field} id={`auth-reset-${name}`} autoComplete="new-password"
                invalid={fieldState.invalid} disabled={disabled} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />
        ))}
        {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}
        <Button type="submit" disabled={disabled} className="h-12 w-full rounded-xl">
          {disabled ? "در حال ذخیره…" : "ذخیره رمز جدید"}
        </Button>
        <button type="button" disabled={disabled || remaining > 0} onClick={resend} className="text-xs text-orange-500 disabled:text-gray-400">
          {remaining > 0 ? `ارسال مجدد تا ${remaining} ثانیه دیگر` : "ارسال مجدد کد بازیابی"}
        </button>
      </FieldGroup>
    </form>
  );
}
