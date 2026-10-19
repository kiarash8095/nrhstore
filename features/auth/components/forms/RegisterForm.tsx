"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller,useForm } from "react-hook-form";
import { FaUser } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import {
Field,
FieldDescription,
FieldError,
FieldGroup,
FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { useAuthActions } from "../../hooks/use-auth-actions";
import { useAuthFlow } from "../../hooks/use-auth-flow";
import {
registerFormSchema,
type RegisterFormValues,
} from "../../schemas/auth-validation";
import { applyAuthError } from "../../utils/auth-helpers";
import { PasswordInput } from "./PasswordInput";

/**
 * ثبت‌نام با فیلدهای واقعی وردپرس. وجود حساب و تکراری‌بودن اطلاعات را بک‌اند بررسی می‌کند.
 */
export function RegisterForm() {
  const { submitRegister } = useAuthActions();
  const { phone, email, isBusy } = useAuthFlow();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone,
      email,
      password: "",
      confirmPassword: "",
    },
    // اعتبارسنجی فقط هنگام ارسال فرم؛ خطای قرمز پیش از فشردن دکمه دیده نمی‌شود
    mode: "onSubmit",
  });

  const isSubmitting = form.formState.isSubmitting;
  const disabled = isSubmitting || isBusy;

  async function onSubmit(values: RegisterFormValues) {
    try {
      await submitRegister(values);
    } catch (error) {
      applyAuthError(form, error, "root");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {(["phone", "email"] as const).map((name) => (
          <Controller key={name} name={name} control={form.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`auth-register-${name}`}>{name === "phone" ? "شماره موبایل" : "ایمیل"}</FieldLabel>
              <Input {...field} id={`auth-register-${name}`} type={name === "phone" ? "tel" : "email"}
                autoComplete={name === "phone" ? "tel" : "email"} dir="ltr" disabled={disabled} aria-invalid={fieldState.invalid}
                className="h-12 rounded-xl border-gray-200 bg-gray-50/70 text-sm" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />
        ))}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="firstName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="auth-first-name">نام</FieldLabel>

                <div className="relative">
                  <FaUser className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-gray-400" />

                  <Input
                    {...field}
                    id="auth-first-name"
                    autoComplete="given-name"
                    placeholder="نام"
                    aria-invalid={fieldState.invalid}
                    disabled={disabled}
                    className="h-12 rounded-xl border-gray-200 bg-gray-50/70 pr-10 text-sm focus:border-orange-400 focus:bg-white"
                  />
                </div>

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="lastName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="auth-last-name">نام خانوادگی</FieldLabel>

                <Input
                  {...field}
                  id="auth-last-name"
                  autoComplete="family-name"
                  placeholder="نام خانوادگی"
                  aria-invalid={fieldState.invalid}
                  disabled={disabled}
                  className="h-12 rounded-xl border-gray-200 bg-gray-50/70 text-sm focus:border-orange-400 focus:bg-white"
                />

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="auth-register-password">رمز عبور</FieldLabel>

              <PasswordInput
                {...field}
                id="auth-register-password"
                autoComplete="new-password"
                placeholder="رمز عبور دلخواه"
                invalid={fieldState.invalid}
                disabled={disabled}
              />

              <FieldDescription className="text-xs">
                حداقل ۸ کاراکتر؛ ترکیبی از حرف و عدد امن‌تر است.
              </FieldDescription>

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="confirmPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="auth-confirm-password">
                تکرار رمز عبور
              </FieldLabel>

              <PasswordInput
                {...field}
                id="auth-confirm-password"
                autoComplete="new-password"
                placeholder="تکرار رمز عبور"
                invalid={fieldState.invalid}
                disabled={disabled}
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
          {isSubmitting ? "در حال ثبت‌نام…" : "ایجاد حساب و ورود"}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-gray-400">
          با ایجاد حساب، قوانین و مقررات فروشگاه را می‌پذیرید.
        </p>
      </FieldGroup>
    </form>
  );
}
