import { authAdapter } from "@/features/auth/server/backend/adapter";
import { readJarFromRequest } from "@/features/auth/server/cookies";
import { jsonAuthError,jsonOk } from "@/features/auth/server/http";
import { authCookieRoute } from "@/features/auth/server/route-handler";

export const GET = authCookieRoute({
  context: "session",
  async handler(request) {
    const session = await authAdapter.getSession(readJarFromRequest(request));
    // Reads must not erase or restore a cookie belonging to a newer login/logout.
    if (!session) return jsonAuthError("session_expired", "نشست فعالی وجود ندارد.", 401);
    return jsonOk({ status: "authenticated" as const, session: { user: session.user } });
  },
});
