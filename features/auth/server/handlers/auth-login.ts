import { loginRequestSchema } from "@/features/auth/contracts";
import { authAdapter } from "@/features/auth/server/backend/adapter";
import { limitAuthRequest } from "@/features/auth/server/http";
import { authRoute,authenticatedResponse } from "@/features/auth/server/route-handler";
import { resetRateLimit } from "@/lib/server/rate-limit";

export const POST = authRoute({
  context: "login", schema: loginRequestSchema,
  async handler(input, request) {
    const identity = input.identifier.toLowerCase();
    const denied = limitAuthRequest(request, "login", identity, 8, 15 * 60 * 1000);
    if (denied) return denied;
    const session = await authAdapter.login(input);
    resetRateLimit(`login:account:${identity}`);
    return authenticatedResponse(session);
  },
});
