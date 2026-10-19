"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { useAuthActions } from "../hooks/use-auth-actions";

/** خروج از حساب برای صفحه‌ی داشبورد (سمت سرور محافظت‌شده است). */
export function LogoutButton() {
  const { logout } = useAuthActions();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setIsPending(true);

    try {
      await logout();
      window.location.assign("/");
    } catch {
      setError("خروج انجام نشد. اتصال خود را بررسی و دوباره تلاش کنید.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
    {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
    <Button
      type="button"
      variant="outline"
      onClick={() => void handleLogout()}
      disabled={isPending}
      className="mt-4 h-11 gap-2 rounded-xl border-gray-200 text-sm font-medium text-gray-600"
    >
      <LogOut className="size-4" />
      {isPending ? "در حال خروج…" : "خروج از حساب"}
    </Button>
    </div>
  );
}
