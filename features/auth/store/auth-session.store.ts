import { create } from "zustand";

import type { AuthSession,AuthUser } from "../types/auth-user.types";

/**
 * State نشست (Session State) — جدا از جریان.
 *
 * - `status: "unknown"` یعنی هنوز نمی‌دانیم کاربر مهمان است یا وارد شده
 *   (لحظه‌ی اول بارگذاری صفحه که AuthProvider در حال بازیابی نشست است).
 *   بدون این حالت، هدر یک لحظه «ورود» نشان می‌داد و بعد «حساب کاربری».
 * - نشست (کوکی httpOnly) خارج از React نگهداری می‌شود؛ این store فقط کاربر و
 *   وضعیت را برای رندر نگه می‌دارد تا هر تغییر کوچک، کل درخت را re-render نکند.
 */

export type SessionStatus = "unknown" | "authenticated" | "unauthenticated";

interface AuthSessionState {
  user: AuthUser | null;
  status: SessionStatus;
}

interface AuthSessionActions {
  setSession: (session: AuthSession) => void;
  /** بازیابی نشست شکست خورد یا کاربر خارج شد */
  setGuest: () => void;
}

export type AuthSessionStore = AuthSessionState & AuthSessionActions;

const INITIAL_STATE: AuthSessionState = {
  user: null,
  status: "unknown",
};

export const useAuthSessionStore = create<AuthSessionStore>((set) => ({
  ...INITIAL_STATE,

  setSession: (session) =>
    set({ user: session.user, status: "authenticated" }),

  setGuest: () => set({ ...INITIAL_STATE, status: "unauthenticated" }),
}));
