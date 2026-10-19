import { resetPasswordRequestSchema } from "@/features/auth/contracts";
import { authAdapter } from "@/features/auth/server/backend/adapter";
import { clearSessionCookie,readJarFromRequest } from "@/features/auth/server/cookies";
import { jsonOk,limitAuthRequest } from "@/features/auth/server/http";
import { authRoute } from "@/features/auth/server/route-handler";
import { revokeSession } from "@/features/auth/server/session-store";

export const POST = authRoute({
  context: "reset-password", schema: resetPasswordRequestSchema,
  async handler(input, request) {
    const denied = limitAuthRequest(request, "otp-verify", input.phone, 5, 15 * 60 * 1000);
    if (denied) return denied;
    // This endpoint verifies AND consumes the code. Never call verify-otp first.
    await authAdapter.resetPassword(input);
    await revokeSession(readJarFromRequest(request));
    return clearSessionCookie(jsonOk({ status: "password-reset" as const }));
  },
});
