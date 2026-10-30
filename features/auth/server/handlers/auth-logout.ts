import { authAdapter } from "@/features/auth/server/backend/adapter";
import { clearSessionCookie,readJarFromRequest } from "@/features/auth/server/cookies";
import { jsonOk } from "@/features/auth/server/http";
import { authCookieRoute } from "@/features/auth/server/route-handler";

// Confirm authoritative revocation (WordPress on Vercel; persistent files locally)
// before clearing the browser cookie.
export const POST = authCookieRoute({
  context: "logout",
  async handler(request) {
    const jar = readJarFromRequest(request);

    await authAdapter.logout(jar);

    return clearSessionCookie(jsonOk({ ok: true as const }));
  },
});
