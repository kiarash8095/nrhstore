import "server-only";

import type { AuthUserDto,LoginRequest,RegisterRequest,ResetPasswordEmailRequest,ResetPasswordRequest } from "../../contracts";
import { AUTH_POLICY,getAuthConfig } from "../config";
import { isEmptyJar,type CookieJar } from "../cookies";
import { isSessionRevoked,revokeSession } from "../session-store";
import { backendRequest } from "./client";
import { AuthBackendError,authError } from "./errors";
import { extractUser,toExpiryInfo } from "./mappers";

export interface AuthSessionResult { user: AuthUserDto; jar: CookieJar }

async function establishSession(jar: CookieJar): Promise<AuthSessionResult> {
  if (isEmptyJar(jar)) throw authError("backend_unavailable", { status: 502 });
  // Boom provides this endpoint to synchronize WordPress/WooCommerce cookies.
  const synced = await backendRequest({ endpoint: "syncSession", jar, context: "sync-session" });
  const session = await readSession(synced.jar);
  if (!session) throw authError("session_expired");
  return session;
}

async function readSession(jar: CookieJar): Promise<AuthSessionResult | null> {
  if (isEmptyJar(jar)) return null;
  if (await isSessionRevoked(jar)) return null;
  try {
    const result = await backendRequest({ endpoint: "me", method: "GET", jar, context: "me" });
    return { user: extractUser(result.data), jar: result.jar };
  } catch (error) {
    if (error instanceof AuthBackendError && error.status === 401) return null;
    throw error;
  }
}

async function revokeWordPressSession(jar: CookieJar): Promise<void> {
  try {
    await backendRequest({ endpoint: "logout", jar, context: "logout" });
  } catch (error) {
    // An already-expired session may be rejected by logout; verify it below.
    if (!(error instanceof AuthBackendError && error.status === 401)) throw error;
  }
  try {
    // Verify the original credentials, not the cleared cookies returned by logout.
    // A successful logout response alone does not prove token revocation.
    await backendRequest({ endpoint: "me", method: "GET", jar, context: "logout-confirmation" });
  } catch (error) {
    if (error instanceof AuthBackendError && error.status === 401) return;
    throw error;
  }
  throw authError("backend_unavailable");
}

export const authAdapter = {
  async sendOtp({ phone }: { phone: string }) {
    const { data } = await backendRequest({ endpoint: "sendOtp", body: { phone }, context: "send-otp" });
    return toExpiryInfo(data, { expiresIn: AUTH_POLICY.otpFallbackExpiresIn, resendAfter: AUTH_POLICY.otpResendCooldown });
  },

  async verifyOtp({ phone, code }: { phone: string; code: string }) {
    const { jar } = await backendRequest({ endpoint: "verifyOtp", body: { phone, otp: code }, context: "verify-otp" });
    return establishSession(jar);
  },

  async login({ identifier, password }: LoginRequest) {
    const { jar } = await backendRequest({ endpoint: "login", body: { username: identifier, password }, context: "login" });
    return establishSession(jar);
  },

  async register({ phone, email, firstName, lastName, password }: RegisterRequest) {
    const { jar } = await backendRequest({
      endpoint: "register", body: { name: `${firstName} ${lastName}`.trim(), phone, email, password }, context: "register",
    });
    return establishSession(jar);
  },

  async resetPassword({ phone, code, password }: ResetPasswordRequest) {
    await backendRequest({ endpoint: "resetPassword", body: { phone, otp: code, password }, context: "reset-password" });
  },

  async forgotPasswordEmail(email: string) {
    try {
      await backendRequest({ endpoint: "forgotPasswordEmail", body: { email }, context: "forgot-password-email" });
    } catch (error) {
      // Keep recovery responses identical for missing and existing accounts.
      if (!(error instanceof AuthBackendError && error.code === "phone_not_found")) throw error;
    }
  },

  async resetPasswordEmail({ email, code, password }: ResetPasswordEmailRequest) {
    await backendRequest({ endpoint: "resetPasswordEmail", body: { email, code, password }, context: "reset-password-email" });
  },

  getSession: readSession,
  async getMe(jar: CookieJar): Promise<AuthUserDto | null> {
    return (await readSession(jar))?.user || null;
  },

  async logout(jar: CookieJar) {
    if (isEmptyJar(jar)) return;
    if (getAuthConfig().upstreamSessionRevocation) {
      await revokeWordPressSession(jar);
      return;
    }
    await revokeSession(jar);
    try { await backendRequest({ endpoint: "logout", jar, context: "logout" }); }
    catch { console.warn("[auth:logout] Backend logout failed; local session was revoked."); }
  },
};
