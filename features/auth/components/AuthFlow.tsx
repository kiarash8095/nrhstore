"use client";

import { CircleAlert,Info } from "lucide-react";
import { AnimatePresence,motion } from "motion/react";

import { cn } from "@/lib/utils";
import { getStepMeta } from "../auth.copy";
import { useAuthFlow } from "../hooks/use-auth-flow";
import type { AuthStep } from "../types/auth-flow.types";

import { OtpForm } from "./forms/OtpForm";
import { PasswordForm } from "./forms/PasswordForm";
import { PhoneForm } from "./forms/PhoneForm";
import { RecoveryForm } from "./forms/RecoveryForm";
import { RegisterForm } from "./forms/RegisterForm";
import { ResetPasswordForm } from "./forms/ResetPasswordForm";
import { SuccessStep } from "./SuccessStep";

/**
 * رندر گام جاری جریان احراز هویت.
 *
 * این کامپوننت فقط «گام فعلی را به کامپوننتش نگاشت می‌کند»: نه تصمیم می‌گیرد، نه
 * درخواستی می‌زند. هر گام فرم خودش را دارد و منطق در `useAuthActions` است.
 */

const STEP_COMPONENTS: Record<AuthStep, React.ComponentType> = {
  phone: PhoneForm,
  password: PasswordForm,
  otp: OtpForm,
  register: RegisterForm,
  recovery: RecoveryForm,
  "reset-password": ResetPasswordForm,
  success: SuccessStep,
};

export function AuthFlow() {
  const { step, notice } = useAuthFlow();
  const StepComponent = STEP_COMPONENTS[step];
  const meta = getStepMeta(step);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2
            key={meta.title}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="text-sm font-bold text-gray-800"
          >
            {meta.title}
          </motion.h2>
        </AnimatePresence>

        {step !== "success" && (
          <p className="text-xs leading-relaxed text-gray-500">{meta.description}</p>
        )}
      </div>

      {notice && <FlowNotice tone={notice.tone} message={notice.message} />}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18 }}
        >
          <StepComponent />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** پیام‌های سطح جریان: خطای دکمه‌ها، اطلاع‌رسانی ارسال کد و نتیجه‌ی تغییر رمز */
function FlowNotice({
  tone,
  message,
}: {
  tone: "info" | "success" | "error";
  message: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-xl border p-3 text-[11px] leading-relaxed",
        tone === "error" && "border-red-100 bg-red-50/70 text-red-600",
        tone === "success" && "border-emerald-100 bg-emerald-50/70 text-emerald-700",
        tone === "info" && "border-gray-100 bg-gray-50 text-gray-600",
      )}
    >
      {tone === "error" ? (
        <CircleAlert className="mt-px size-3.5 shrink-0" />
      ) : (
        <Info className="mt-px size-3.5 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}
