import "server-only";

const paths = {
  sendOtp: "/send-otp", verifyOtp: "/verify-otp", login: "/login",
  register: "/register", me: "/me", syncSession: "/sync-session",
  logout: "/logout", resetPassword: "/reset-password",
  forgotPasswordEmail: "/forgot-password-email", resetPasswordEmail: "/reset-password-email",
} as const;

export type AuthEndpointName = keyof typeof paths;

export function resolveAuthUrl(endpoint: AuthEndpointName): string {
  const base = new URL(process.env.WP_AUTH_BASE_URL || "https://nrhstore.ir/wp-json/");
  const localTest = process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
  if (base.username || base.password || (base.protocol !== "https:" && !(localTest && base.protocol === "http:"))) {
    throw new Error("WordPress authentication requires an HTTPS URL");
  }
  const namespace = (process.env.WP_AUTH_NAMESPACE || "boom/v1").replace(/^\/+|\/+$/g, "");
  return `${base.origin}${base.pathname.replace(/\/+$/, "")}/${namespace}${paths[endpoint]}`;
}

export function resolveAuthNonceUrl() {
  const base = new URL(resolveAuthUrl("me"));
  const prefix = base.pathname.split("/wp-json/")[0];
  base.pathname = `${prefix}/wp-admin/admin-ajax.php`;
  base.search = "action=rest-nonce";
  return base.toString();
}
