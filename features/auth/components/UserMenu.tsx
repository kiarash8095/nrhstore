"use client";

import { Menu } from "@base-ui/react/menu";
import { LayoutDashboard,LogOut } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { useAuthActions } from "../hooks/use-auth-actions";
import type { AuthUser } from "../types/auth-user.types";
import { getUserInitials,maskIranMobile } from "../utils/auth-helpers";

/**
 * منوی کاربر وارد‌شده در هدر.
 * نمایش داده‌ی نشست اینجاست؛ خروج از حساب یک اکشن جریان است و به `useAuthActions` سپرده می‌شود.
 */
export function UserMenu({ user }: { user: AuthUser }) {
  const { logout } = useAuthActions();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      // سرور کامپوننت‌های محافظت‌شده باید بفهمند کوکی پاک شده است
      window.location.assign("/");
    } catch {
      setError("خروج انجام نشد. دوباره تلاش کنید.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <>
    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    <Menu.Root>
      <Menu.Trigger
        render={
          <button
            type="button"
            aria-label="منوی حساب کاربری"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-sm font-bold text-orange-600 shadow-sm transition hover:border-orange-400 hover:shadow-md"
          />
        }
      >
        {getUserInitials(user)}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-[60]">
          <Menu.Popup className="min-w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 text-sm shadow-[0_16px_40px_rgba(15,23,42,0.14)] outline-none">
            <div className="border-b border-gray-100 px-3 pt-1.5 pb-2.5">
              <p className="truncate text-xs font-bold text-gray-800">
                {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                  "کاربر نوین رایانه"}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400" dir="ltr">
                {user.phone ? maskIranMobile(user.phone) : user.email}
              </p>
            </div>

            <Menu.LinkItem
              render={<Link href="/dashboard" />}
              className="mt-1 flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-gray-700 outline-none transition hover:bg-orange-50 hover:text-orange-600 data-[highlighted]:bg-orange-50 data-[highlighted]:text-orange-600"
            >
              <LayoutDashboard className="size-4" />
              داشبورد و سفارش‌های من
            </Menu.LinkItem>

            <Menu.Item
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-red-500 outline-none transition hover:bg-red-50 data-[highlighted]:bg-red-50",
                isLoggingOut && "opacity-60",
              )}
            >
              <LogOut className="size-4" />
              {isLoggingOut ? "در حال خروج…" : "خروج از حساب"}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
    </>
  );
}
