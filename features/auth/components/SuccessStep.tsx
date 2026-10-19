"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";

import { useAuth } from "../hooks/use-auth";

/** گام پایانی: تایید ورود. بستن مودال و هدایت کاربر را `AuthModal` انجام می‌دهد. */
export function SuccessStep() {
  const { displayName } = useAuth();

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        className="flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 ring-8 ring-emerald-50/50"
      >
        <Check className="size-8" strokeWidth={2.5} />
      </motion.span>

      <div className="space-y-1">
        <p className="text-sm font-bold text-gray-800">{displayName} عزیز، خوش آمدید</p>
        <p className="text-xs text-gray-500">
          ورود شما با موفقیت انجام شد. در حال انتقال…
        </p>
      </div>
    </div>
  );
}
