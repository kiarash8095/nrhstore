"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller,useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
Field,
FieldDescription,
FieldError,
FieldGroup,
FieldLabel,
} from "@/components/ui/field";

import { useAuthActions } from "../../hooks/use-auth-actions";
import { useAuthFlow } from "../../hooks/use-auth-flow";
import {
passwordFormSchema,
type PasswordFormValues,
} from "../../schemas/auth-validation";
import { applyAuthError,maskIranMobile } from "../../utils/auth-helpers";
import { PasswordInput } from "./PasswordInput";

/**
 * گام ۳-الف: ورود با رمز عبور.
 *
 * این گام دو راه خروج دیگر هم دارد: ورود با کد یک‌بارمصرف و بازیابی رمز عبور.
 * هر دو دکمه‌اند (نه فرم)، پس خطایشان به‌جای فیلد، در پیام جریان نمایش داده می‌شود.
 */
export function PasswordForm() {
  const { submitPassword, chooseOtpLogin, requestPasswordRecovery, startRegister } = useAuthActions();
  const { identifier, phone, isBusy } = useAuthFlow();

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { password: "" },
    // اعتبارسنجی فقط هنگام ارسال فرم؛ خطای قرمز پیش از فشردن دکمه دیده نمی‌شود
    mode: "onSubmit",
  });

  const isSubmitting = form.formState.isSubmitting;
  const disabled = isSubmitting || isBusy;

  async function onSubmit(values: PasswordFormValues) {
    try {
      await submitPassword(values.password);
    } catch (error) {
      // رمز نامعتبر از فیلد پاک می‌شود تا کاربر دوباره تایپ کند؛
      // اول پاک‌سازی، بعد نشاندن خطا (reset خطا را هم پاک می‌کند)
      form.resetField("password");
      applyAuthError(form, error, "password");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field>
          <FieldDescription className="text-xs" dir="ltr">
            {maskIranMobile(identifier)}
          </FieldDescription>
        </Field>

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="auth-password">رمز عبور</FieldLabel>

              <PasswordInput
                {...field}
                id="auth-password"
                autoComplete="current-password"
                autoFocus
                placeholder="رمز عبور خود را وارد کنید"
                invalid={fieldState.invalid}
                disabled={disabled}
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <button
          type="button"
          onClick={requestPasswordRecovery}
          disabled={disabled}
          className="w-fit self-start text-xs text-orange-500 transition hover:text-orange-600 disabled:opacity-50"
        >
          رمز عبور خود را فراموش کرده‌اید؟
        </button>

        {form.formState.errors.root && (
          <FieldError errors={[form.formState.errors.root]} />
        )}

        <Button
          type="submit"
          disabled={disabled}
          className="h-12 w-full rounded-xl text-sm font-medium"
        >
          {isSubmitting ? "در حال ورود…" : "ورود به حساب"}
        </Button>

        {phone && <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-[11px] text-gray-400">یا</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>}

        {phone && <Button
          type="button"
          variant="outline"
          onClick={chooseOtpLogin}
          disabled={disabled}
          className="h-12 w-full rounded-xl border-gray-200 text-sm font-medium text-gray-700"
        >
          ورود با کد تایید (پیامکی)
        </Button>}
        <Button type="button" variant="ghost" onClick={startRegister} disabled={disabled} className="w-full">
          ساخت حساب جدید
        </Button>
      </FieldGroup>
    </form>
  );
}
