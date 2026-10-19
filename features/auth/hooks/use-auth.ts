"use client";

import { useAuthSessionStore } from "../store/auth-session.store";
import { getUserDisplayName } from "../utils/auth-helpers";

/** Read-only identity for queued requests; this does not expose or change credentials. */
export function getAuthIdentity(): string {
  const { status, user } = useAuthSessionStore.getState();
  return status === 'authenticated' && user ? user.id : 'guest';
}

/**
 * خواندن نشست برای UI (هدر، منوی کاربر، صفحات).
 *
 * این هوک هیچ اکشنی ندارد: فقط وضعیت را می‌خواند تا کامپوننت‌ها به منطق جریان
 * وابسته نشوند. تغییر نشست فقط از `useAuthActions` و `AuthProvider` ممکن است.
 */
export function useAuth() {
  const user = useAuthSessionStore((state) => state.user);
  const status = useAuthSessionStore((state) => state.status);

  return {
    user,
    status,
    displayName: getUserDisplayName(user),
    isAuthenticated: status === "authenticated" && user !== null,
    /** هنوز در حال بازیابی نشست از کوکی هستیم */
    isRestoring: status === "unknown",
  };
}
