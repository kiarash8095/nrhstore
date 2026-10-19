import { resetPasswordEmailRequestSchema } from "@/features/auth/contracts";
import { authAdapter } from "@/features/auth/server/backend/adapter";
import { clearSessionCookie,readJarFromRequest } from "@/features/auth/server/cookies";
import { jsonOk,limitAuthRequest } from "@/features/auth/server/http";
import { authRoute } from "@/features/auth/server/route-handler";
import { revokeSession } from "@/features/auth/server/session-store";

export const POST = authRoute({
  context: "reset-password-email", schema: resetPasswordEmailRequestSchema,
  async handler(input, request) {
    const denied = limitAuthRequest(request, "reset-email", input.email.toLowerCase(), 5, 15 * 60 * 1000);
    if (denied) return denied;
    await authAdapter.resetPasswordEmail(input);
    await revokeSession(readJarFromRequest(request));
    return clearSessionCookie(jsonOk({ status: "password-reset" as const }));
  },
});
