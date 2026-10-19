import "server-only";

import { cookies } from "next/headers";
import { createHash,createHmac,randomBytes,timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "nrh_banners_admin";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 8;

export function adminConfig() {
  const username = process.env.BANNERS_ADMIN_USERNAME;
  const password = process.env.BANNERS_ADMIN_PASSWORD;
  const secret = process.env.BANNERS_ADMIN_SESSION_SECRET;
  if (!username || !password || !secret || password.length < 12 || secret.length < 32) return null;
  return { username, password, secret };
}

function sameValue(left: string, right: string) {
  return timingSafeEqual(createHash("sha256").update(left).digest(), createHash("sha256").update(right).digest());
}

export function checkAdminCredentials(username: string, password: string) {
  const config = adminConfig();
  if (!config) return false;
  const validUsername = sameValue(username, config.username);
  const validPassword = sameValue(password, config.password);
  return validUsername && validPassword;
}

function signature(payload: string, config: NonNullable<ReturnType<typeof adminConfig>>) {
  // Changing the configured credentials invalidates all previous sessions.
  return createHmac("sha256", config.secret)
    .update(JSON.stringify([payload, config.username, config.password])).digest("base64url");
}

export function createAdminToken() {
  const config = adminConfig();
  if (!config) throw new Error("Admin credentials are not configured");
  const payload = Buffer.from(JSON.stringify({
    expires: Date.now() + ADMIN_SESSION_SECONDS * 1000,
    nonce: randomBytes(24).toString("base64url"),
  })).toString("base64url");
  return `${payload}.${signature(payload, config)}`;
}

export function verifyAdminToken(token: string | undefined) {
  const config = adminConfig();
  if (!config || !token || token.length > 1024) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !sameValue(parts[1], signature(parts[0], config))) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return typeof payload.expires === "number" && payload.expires > Date.now() &&
      payload.expires <= Date.now() + ADMIN_SESSION_SECONDS * 1000;
  } catch {
    return false;
  }
}

export async function isBannerAdmin() {
  return verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ADMIN_SESSION_SECONDS,
};
