"use client";

import { Eye,EyeOff,Lock } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { useAuthFlow } from "../../hooks/use-auth-flow";

interface PasswordInputProps
  extends Omit<React.ComponentProps<typeof Input>, "type"> {
  /** برای هم‌خوانی با aria-invalid و رنگ خطای shadcn */
  invalid?: boolean;
}

/**
 * ورودی رمز عبور با کلید نمایش/پنهان‌سازی.
 *
 * کامپوننت کاملاً نمایشی است (value/onChange را از بیرون می‌گیرد) تا هر سه فرمی که
 * رمز می‌گیرند، ظاهر و رفتار یکسان داشته باشند.
 */
export function PasswordInput({
  invalid,
  className,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { isBusy } = useAuthFlow();

  return (
    <div className="relative">
      <Lock
        className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-gray-400"
        aria-hidden="true"
      />

      <Input
        {...props}
        type={isVisible ? "text" : "password"}
        aria-invalid={invalid}
        disabled={props.disabled ?? isBusy}
        dir="rtl"
        className={cn(
          "h-12 rounded-xl border-gray-200 bg-gray-50/70 pr-10 pl-11 text-sm focus:border-orange-400 focus:bg-white",
          className,
        )}
      />

      <button
        type="button"
        onClick={() => setIsVisible((visible) => !visible)}
        aria-label={isVisible ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
        aria-pressed={isVisible}
        tabIndex={-1}
        className="absolute top-1/2 left-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
      >
        {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
