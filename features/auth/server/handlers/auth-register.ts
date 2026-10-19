import { registerRequestSchema } from "@/features/auth/contracts";
import { authAdapter } from "@/features/auth/server/backend/adapter";
import { limitAuthRequest } from "@/features/auth/server/http";
import { authRoute,authenticatedResponse } from "@/features/auth/server/route-handler";

export const POST = authRoute({
  context: "register", schema: registerRequestSchema,
  async handler(input, request) {
    const denied = limitAuthRequest(request, "register", input.email.toLowerCase(), 5, 60 * 60 * 1000);
    if (denied) return denied;
    return authenticatedResponse(await authAdapter.register(input));
  },
});
