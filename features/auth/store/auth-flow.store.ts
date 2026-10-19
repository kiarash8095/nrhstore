import { safeAuthNextPath } from "@/features/auth/contracts";
import { create } from "zustand";
import type { AuthFlowContext,AuthFlowNotice,AuthStep } from "../types/auth-flow.types";

interface AuthFlowState extends AuthFlowContext {
  isOpen: boolean;
  isBusy: boolean;
  resendAvailableAt: number | null;
  open: (options?: { nextPath?: string | null; notice?: AuthFlowNotice | null }) => void;
  close: () => void;
  goBack: () => void;
  setStep: (step: AuthStep, values?: Partial<AuthFlowContext>) => void;
  setBusy: (busy: boolean) => void;
  setNotice: (notice: AuthFlowNotice | null) => void;
  setResendAvailableAt: (time: number | null) => void;
}

const initialState = {
  step: "phone" as AuthStep, intent: "login" as const, identifier: "", phone: "", email: "",
  recoveryChannel: "sms" as const, notice: null, nextPath: null,
  isOpen: false, isBusy: false, resendAvailableAt: null,
};

export const useAuthFlowStore = create<AuthFlowState>((set, get) => ({
  ...initialState,
  open: (options) => set({
    ...initialState, isOpen: true, nextPath: safeAuthNextPath(options?.nextPath), notice: options?.notice || null,
  }),
  close: () => { if (!get().isBusy) set(initialState); },
  setStep: (step, values) => set({ ...values, step, notice: null }),
  goBack: () => {
    const { step, isBusy } = get();
    if (isBusy) return;
    const previous: Record<AuthStep, AuthStep> = {
      phone: "phone", password: "phone", otp: "password", register: "phone",
      recovery: "password", "reset-password": "recovery", success: "phone",
    };
    set({ step: previous[step], notice: null });
  },
  setBusy: isBusy => set({ isBusy }),
  setNotice: notice => set({ notice }),
  setResendAvailableAt: resendAvailableAt => set({ resendAvailableAt }),
}));
