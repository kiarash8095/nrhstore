"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";
import userRound from "@/public/user-round.svg";

import { useAuth } from "../hooks/use-auth";
import { useAuthActions } from "../hooks/use-auth-actions";
import { UserMenu } from "./UserMenu";

/**
 * دکمه‌ی حساب کاربری در هدر — نقطه‌ی ورود به جریان احراز هویت.
 *
 * سه حالت دارد و هر سه را از نشست می‌خواند:
 *  - در حال بازیابی نشست → همان دکمه با حالت بی‌رنگ (بدون پرش چیدمان)
 *  - مهمان → کلیک، مودال را باز می‌کند
 *  - وارد‌شده → منوی کاربر
 */
export function AuthAccountButton({ className }: { className?: string }) {
  const { isAuthenticated, isRestoring, user } = useAuth();
  const { openAuth } = useAuthActions();

  const shellClass = cn(
    "flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition",
    className,
  );

  if (isAuthenticated && user) {
    return <UserMenu user={user} />;
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (!isRestoring) void openAuth();
      }}
      disabled={isRestoring}
      aria-label="حساب کاربری"
      aria-busy={isRestoring}
      className={cn(
        shellClass,
        isRestoring
          ? "cursor-wait opacity-60"
          : "cursor-pointer hover:border-orange-500 hover:shadow-md",
      )}
    >
      <Image className="h-5 w-5" src={userRound} alt="" />
    </button>
  );
}
