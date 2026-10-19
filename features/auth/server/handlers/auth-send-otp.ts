import { sendOtpRequestSchema } from "@/features/auth/contracts";
import { authAdapter } from "@/features/auth/server/backend/adapter";
import { AUTH_POLICY } from "@/features/auth/server/config";
import { jsonOk,limitAuthRequest,tooManyRequests } from "@/features/auth/server/http";
import { authRoute } from "@/features/auth/server/route-handler";
import { consumeRateLimit,peekRateLimit,resetRateLimit } from "@/lib/server/rate-limit";

export const POST = authRoute({
  context: "send-otp", schema: sendOtpRequestSchema,
  async handler({ phone }, request) {
    const key = `otp-cooldown:${phone}`;
    const remaining = peekRateLimit(key);
    if (remaining) return tooManyRequests(remaining);
    const denied = limitAuthRequest(request, "send-otp", phone, 5, 60 * 60 * 1000);
    if (denied) return denied;
    // Reserve BEFORE the network call so concurrent sends cannot bypass cooldown.
    const reservation = consumeRateLimit(key, 1, AUTH_POLICY.otpResendCooldown * 1000);
    if (!reservation.allowed) return tooManyRequests(reservation.retryAfter);
    try {
      const info = await authAdapter.sendOtp({ phone });
      resetRateLimit(key);
      consumeRateLimit(key, 1, info.resendAfter * 1000);
      resetRateLimit(`otp-verify:account:${phone}`);
      return jsonOk({ ok: true as const, ...info });
    } catch (error) {
      resetRateLimit(key);
      throw error;
    }
  },
});
