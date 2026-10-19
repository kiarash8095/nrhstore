export type AuthStep = "phone" | "password" | "otp" | "register" | "recovery" | "reset-password" | "success";
export type AuthIntent = "login" | "register" | "recovery";
export type RecoveryChannel = "sms" | "email";

export interface AuthFlowNotice { tone: "info" | "success" | "error"; message: string }

export interface AuthFlowContext {
  step: AuthStep;
  intent: AuthIntent;
  identifier: string;
  phone: string;
  email: string;
  recoveryChannel: RecoveryChannel;
  notice: AuthFlowNotice | null;
  nextPath: string | null;
}
