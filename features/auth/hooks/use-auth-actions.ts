"use client";

import { identifierSchema,iranMobileSchema } from "@/features/auth/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { AuthClientError,toAuthClientError } from "../api/auth.error";
import type { RecoveryFormValues,RegisterFormValues,ResetPasswordFormValues } from "../schemas/auth-validation";
import { useAuthFlowStore } from "../store/auth-flow.store";
import { useAuthSessionStore } from "../store/auth-session.store";
import type { AuthSession } from "../types/auth-user.types";
import { broadcastAuthEvent } from "../utils/auth-broadcast";

export function useAuthActions() {
  const queryClient = useQueryClient();
  const flow = useAuthFlowStore;
  const session = useAuthSessionStore;

  async function perform<T>(action: () => Promise<T>) {
    if (flow.getState().isBusy) throw new AuthClientError({ code: "rate_limited", message: "درخواست قبلی هنوز در حال انجام است." });
    flow.getState().setBusy(true);
    try { return await action(); }
    finally { flow.getState().setBusy(false); }
  }

  function applySession(value: AuthSession) {
    session.getState().setSession(value);
    queryClient.clear();
    broadcastAuthEvent("login");
    flow.getState().setStep("success");
  }

  function beginLogin(value: string) {
    const identifier = identifierSchema.parse(value);
    const phone = iranMobileSchema.safeParse(identifier);
    flow.getState().setStep("password", {
      identifier, phone: phone.success ? phone.data : "",
      email: identifier.includes("@") ? identifier : "", intent: "login",
    });
  }

  function startRegister() {
    if (!flow.getState().isBusy) flow.getState().setStep("register", { intent: "register" });
  }

  async function chooseOtpLogin() {
    try {
      await perform(async () => {
        const { phone } = flow.getState();
        const challenge = await authApi.sendOtp({ phone, purpose: "login" });
        flow.getState().setResendAvailableAt(Date.now() + challenge.resendAfter * 1000);
        flow.getState().setStep("otp", { intent: "login" });
      });
    } catch (error) { flow.getState().setNotice({ tone: "error", message: toAuthClientError(error).message }); }
  }

  function requestPasswordRecovery() {
    const { email } = flow.getState();
    flow.getState().setStep("recovery", { intent: "recovery", recoveryChannel: email ? "email" : "sms" });
  }

  async function sendRecovery(channel: "sms" | "email", destination: string) {
    if (channel === "sms") {
      const challenge = await authApi.sendOtp({ phone: destination, purpose: "recovery" });
      flow.getState().setResendAvailableAt(Date.now() + challenge.resendAfter * 1000);
    } else {
      await authApi.forgotPasswordEmail({ email: destination });
      flow.getState().setResendAvailableAt(Date.now() + 120_000);
    }
  }

  async function submitRecovery(values: RecoveryFormValues) {
    return perform(async () => {
      await sendRecovery(values.channel, values.destination);
      flow.getState().setStep("reset-password", {
        recoveryChannel: values.channel,
        ...(values.channel === "sms" ? { phone: values.destination } : { email: values.destination }),
      });
      flow.getState().setNotice({ tone: "info", message: "در صورت وجود حساب، کد ارسال شده است. کد و رمز جدید را وارد کنید." });
    });
  }

  async function resendOtp() {
    return perform(async () => {
      const { phone, email, intent, recoveryChannel } = flow.getState();
      if (intent === "recovery") await sendRecovery(recoveryChannel, recoveryChannel === "sms" ? phone : email);
      else {
        const challenge = await authApi.sendOtp({ phone, purpose: "login" });
        flow.getState().setResendAvailableAt(Date.now() + challenge.resendAfter * 1000);
      }
      flow.getState().setNotice({ tone: "success", message: "درخواست کد جدید انجام شد." });
    });
  }

  async function verifyOtp(code: string) {
    return perform(async () => applySession((await authApi.verifyOtp({ phone: flow.getState().phone, code })).session));
  }

  async function submitPassword(password: string) {
    return perform(async () => applySession(await authApi.login({ identifier: flow.getState().identifier, password })));
  }

  async function submitRegister(values: RegisterFormValues) {
    return perform(async () => {
      const { phone, email, firstName, lastName, password } = values;
      applySession(await authApi.register({ phone, email, firstName, lastName, password }));
    });
  }

  async function submitPasswordReset(values: ResetPasswordFormValues) {
    return perform(async () => {
      const { phone, email, recoveryChannel } = flow.getState();
      if (recoveryChannel === "sms") await authApi.resetPassword({ phone, code: values.code, password: values.password });
      else await authApi.resetPasswordEmail({ email, code: values.code, password: values.password });
      session.getState().setGuest();
      queryClient.clear();
      broadcastAuthEvent("logout");
      flow.getState().setStep("password", { identifier: recoveryChannel === "sms" ? phone : email, intent: "login" });
      flow.getState().setNotice({ tone: "success", message: "رمز عبور تغییر کرد. با رمز جدید وارد شوید." });
    });
  }

  async function logout() {
    await authApi.logout();
    session.getState().setGuest();
    queryClient.clear();
    flow.getState().close();
    broadcastAuthEvent("logout");
  }

  async function refreshSession() {
    const snapshot = session.getState();
    const value = await authApi.getSession();
    if (session.getState() !== snapshot) return;
    if (value) session.getState().setSession(value);
    else { session.getState().setGuest(); queryClient.clear(); }
  }

  return {
    refreshSession,
    openAuth: (options?: { nextPath?: string | null }) => flow.getState().open(options),
    closeAuth: () => flow.getState().close(),
    beginLogin, startRegister, chooseOtpLogin, verifyOtp, resendOtp,
    requestPasswordRecovery, submitRecovery, submitPassword, submitRegister, submitPasswordReset, logout,
  };
}
