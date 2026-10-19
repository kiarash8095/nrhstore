import { forgotPasswordEmailRequestSchema } from "@/features/auth/contracts";
import { authAdapter } from "@/features/auth/server/backend/adapter";
import { jsonOk,limitAuthRequest } from "@/features/auth/server/http";
import { authRoute } from "@/features/auth/server/route-handler";

export const POST = authRoute({
  context: "forgot-password-email", schema: forgotPasswordEmailRequestSchema,
  async handler({ email }, request) {
    const denied = limitAuthRequest(request, "forgot-email", email.toLowerCase(), 5, 60 * 60 * 1000);
    if (denied) return denied;
    await authAdapter.forgotPasswordEmail(email);
    return jsonOk({ ok: true as const });
  },
});
