"use client";

import { ArrowRight,ShieldCheck,UserRound,X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
Dialog,
DialogContent,
DialogDescription,
DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { AUTH_MODAL_COPY } from "../auth.copy";
import { useAuthFlow } from "../hooks/use-auth-flow";
import { useAuthFlowStore } from "../store/auth-flow.store";
import { AuthFlow } from "./AuthFlow";

/** چقدر پیام «خوش آمدید» بماند؛ بعد از آن مودال بسته و صفحه همگام می‌شود */
const SUCCESS_DISMISS_MS = 1600;

/**
 * مودالی که با کلیک روی آیکن کاربر در هدر باز می‌شود.
 *
 * مسئولیت این کامپوننت فقط «هماهنگی» است: پوسته‌ی مودال، دکمه‌های بازگشت/بستن و
 * هدایت کاربر پس از ورود موفق. نه گام‌ها را می‌شناسد و نه درخواستی می‌زند؛
 * گام‌ها را `AuthFlow` رندر می‌کند و منطق در `useAuthActions` است.
 */
export function AuthModal() {
  const { isOpen, step, canGoBack, nextPath, isBusy } = useAuthFlow();
  // اکشن‌های store هویت پایداری دارند؛ استفاده از آن‌ها از ری‌ست شدن تایمر جلوگیری می‌کند
  const close = useAuthFlowStore((state) => state.close);
  const goBack = useAuthFlowStore((state) => state.goBack);
  const router = useRouter();

  // پس از ورود: بستن مودال، رفتن به مقصدی که کاربر قصدش را داشت، و رندر دوباره‌ی
  // سرور (سرور کامپوننت‌ها کوکی تازه را باید ببینند).
  useEffect(() => {
    if (!isOpen || step !== "success") return;

    const timer = setTimeout(() => {
      close();
      if (nextPath) window.location.assign(nextPath);
      else router.refresh();
    }, SUCCESS_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [isOpen, step, nextPath, close, router]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && step !== "success" && !isBusy) close();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-1.5rem)] gap-0 overflow-y-auto rounded-3xl border-0 p-0 sm:max-w-[420px]"
      >
        {/* نوار برند */}
        <div className="relative overflow-hidden bg-gradient-to-bl from-orange-500 via-orange-500 to-orange-400 px-4 pt-4 pb-5 text-white">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -left-10 size-32 rounded-full bg-white/10"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -bottom-14 size-28 rounded-full bg-white/10"
          />

          <div className="relative flex items-center justify-between gap-2">
            {/* در چیدمان راست‌به‌چپ، «بازگشت» سمت راست است */}
            <div className="flex size-9 items-center justify-center">
              {canGoBack && (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={isBusy}
                  aria-label="بازگشت به مرحله قبل"
                  className="flex size-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white"
                >
                  <ArrowRight className="size-4.5" />
                </button>
              )}
            </div>

            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                <UserRound className="size-4.5" />
              </span>

              <div className="min-w-0 text-right">
                <DialogTitle className="truncate text-sm font-bold">
                  {AUTH_MODAL_COPY.title}
                </DialogTitle>
                <p className="truncate text-[11px] text-white/80">
                  {AUTH_MODAL_COPY.brandLine}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={close}
              disabled={isBusy}
              aria-label="بستن پنجره ورود"
              className="flex size-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white"
            >
              <X className="size-4.5" />
            </button>
          </div>
        </div>

        {/* بدنه: گام جاری */}
        <div className={cn("bg-white px-5 py-5", step === "success" && "py-7")}>
          <DialogDescription className="sr-only">
            فرم ورود، ثبت‌نام و بازیابی رمز عبور فروشگاه نوین رایانه همدان
          </DialogDescription>

          <AuthFlow />
        </div>

        {step !== "success" && (
          <div className="flex items-center justify-center gap-1.5 border-t border-gray-100 bg-gray-50/70 px-5 py-3 text-[10px] text-gray-400">
            <ShieldCheck className="size-3.5 text-orange-400" />
            نشست شما رمزنگاری‌شده و در کوکی امن نگهداری می‌شود.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
