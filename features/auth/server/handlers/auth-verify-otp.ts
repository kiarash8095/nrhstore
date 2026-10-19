import { verifyOtpRequestSchema } from "@/features/auth/contracts";
import { authAdapter } from "@/features/auth/server/backend/adapter";
import { limitAuthRequest } from "@/features/auth/server/http";
import { authRoute,authenticatedResponse } from "@/features/auth/server/route-handler";
import { resetRateLimit } from "@/lib/server/rate-limit";

export const POST = authRoute({
  context: "verify-otp", schema: verifyOtpRequestSchema,
  async handler(input, request) {
    const denied = limitAuthRequest(request, "otp-verify", input.phone, 5, 15 * 60 * 1000);
    if (denied) return denied;
    const session = await authAdapter.verifyOtp(input);
    resetRateLimit(`otp-verify:account:${input.phone}`);
    return authenticatedResponse(session);
  },
});
