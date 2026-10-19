"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller,useForm } from "react-hook-form";
import { FaPhoneAlt } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import {
Field,
FieldDescription,
FieldError,
FieldGroup,
FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { useAuth } from "../../hooks/use-auth";
import { useAuthActions } from "../../hooks/use-auth-actions";
import {
phoneFormSchema,
type PhoneFormValues,
} from "../../schemas/auth-validation";
import { applyAuthError } from "../../utils/auth-helpers";

/**
 * دریافت شناسه ورود بدون استعلام ساختگی وجود حساب.
 */
export function PhoneForm() {
  const { beginLogin, startRegister } = useAuthActions();
  const { isRestoring } = useAuth();

  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { identifier: "" },
    // اعتبارسنجی فقط هنگام ارسال فرم؛ خطای قرمز پیش از فشردن دکمه دیده نمی‌شود
    mode: "onSubmit",
  });

  const isSubmitting = form.formState.isSubmitting;
  const disabled = isSubmitting || isRestoring;

  async function onSubmit(values: PhoneFormValues) {
    try {
      beginLogin(values.identifier);
    } catch (error) {
      applyAuthError(form, error, "identifier");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Controller
          name="identifier"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="auth-phone">شماره موبایل، ایمیل یا نام کاربری</FieldLabel>

              <div className="relative">
                <FaPhoneAlt className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-gray-400" />

                <Input
                  {...field}
                  id="auth-phone"
                  type="text"
                  dir="ltr"
                  autoComplete="username"
                  autoFocus
                  placeholder="شماره موبایل، ایمیل یا نام کاربری"
                  aria-invalid={fieldState.invalid}
                  disabled={disabled}
                  className="h-12 rounded-xl border-gray-200 bg-gray-50/70 pr-10 text-left text-sm tracking-widest placeholder:tracking-normal placeholder:text-gray-400 focus:border-orange-400 focus:bg-white"
                />
              </div>

              <FieldDescription className="text-xs">
                برای ورود پیامکی، شماره موبایل خود را وارد کنید.
              </FieldDescription>

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
          ادامه ورود
        </Button>
        <Button type="button" variant="outline" onClick={startRegister} disabled={disabled} className="h-12 w-full rounded-xl">
          حساب ندارید؟ ثبت‌نام
        </Button>
      </FieldGroup>
    </form>
  );
}
