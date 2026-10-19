"use client";

import { Button } from "@/components/ui/button";
import { Field,FieldError,FieldGroup,FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller,useForm,useWatch } from "react-hook-form";
import { useAuthActions } from "../../hooks/use-auth-actions";
import { useAuthFlow } from "../../hooks/use-auth-flow";
import { recoveryFormSchema,type RecoveryFormValues } from "../../schemas/auth-validation";
import { applyAuthError } from "../../utils/auth-helpers";

export function RecoveryForm() {
  const { phone, email, recoveryChannel, isBusy } = useAuthFlow();
  const { submitRecovery } = useAuthActions();
  const form = useForm<RecoveryFormValues>({
    resolver: zodResolver(recoveryFormSchema),
    defaultValues: { channel: recoveryChannel, destination: recoveryChannel === "sms" ? phone : email },
  });
  const channel = useWatch({ control: form.control, name: "channel" });
  const disabled = isBusy || form.formState.isSubmitting;
  async function submit(values: RecoveryFormValues) {
    try { await submitRecovery(values); } catch (error) { applyAuthError(form, error); }
  }
  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <fieldset disabled={disabled} className="flex gap-4">
          <legend className="mb-3 text-xs font-medium">روش دریافت کد بازیابی</legend>
          {(["sms", "email"] as const).map(value => (
            <label key={value} className="flex items-center gap-2 text-xs">
              <input type="radio" value={value} {...form.register("channel")} onChange={() => {
                form.setValue("channel", value);
                form.setValue("destination", value === "sms" ? phone : email);
                form.clearErrors();
              }} />
              {value === "sms" ? "پیامک" : "ایمیل"}
            </label>
          ))}
        </fieldset>
        <Controller name="destination" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="auth-recovery-destination">{channel === "sms" ? "شماره موبایل" : "ایمیل"}</FieldLabel>
            <Input {...field} id="auth-recovery-destination" type={channel === "sms" ? "tel" : "email"}
              autoComplete={channel === "sms" ? "tel" : "email"} dir="ltr" disabled={disabled}
              aria-invalid={fieldState.invalid} className="h-12 rounded-xl border-gray-200 bg-gray-50/70 text-sm" />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />
        {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}
        <Button type="submit" disabled={disabled} className="h-12 w-full rounded-xl">
          {disabled ? "در حال ارسال…" : "دریافت کد بازیابی"}
        </Button>
      </FieldGroup>
    </form>
  );
}
