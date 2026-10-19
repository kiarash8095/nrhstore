import "server-only";

import { cookies } from "next/headers";
import type { NextRequest,NextResponse } from "next/server";
import { createCipheriv,createDecipheriv,createHash,randomBytes,randomUUID } from "node:crypto";
import { getAuthConfig,getSessionCookieName } from "./config";
<<<<<<< HEAD
import { getAuthSessionSecret } from "@/lib/server/runtime-config.cjs";
=======
>>>>>>> 5ac6dc77aee4b7ce44d07237d793f692485c06b6

export type CookieJar = Record<string, string>;
const SESSION_AAD = Buffer.from("nrh-auth-session-v1");
const validName = /^[a-zA-Z0-9_-]+$/;
const validValue = /^[\x21-\x7e]*$/;
const SESSION_ID = "__nrh_session_id";
const validSessionId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function getSessionId(jar: CookieJar): string | null {
  const id = jar[SESSION_ID];
  return typeof id === "string" && validSessionId.test(id) ? id : null;
}

function sessionKey() {
<<<<<<< HEAD
  const secret = getAuthSessionSecret();
=======
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SESSION_SECRET must contain at least 32 characters");
>>>>>>> 5ac6dc77aee4b7ce44d07237d793f692485c06b6
  return createHash("sha256").update(secret).digest();
}

function sanitizeJar(input: unknown): CookieJar {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const jar: CookieJar = {};
  for (const [name, value] of Object.entries(input)) {
    if (name === "me") continue; // Boom's client profile cache is not an authentication credential.
    if (validName.test(name) && !["__proto__", "constructor", "prototype"].includes(name) &&
        typeof value === "string" && validValue.test(value) && !/[;,]/.test(value)) {
      jar[name] = value;
    }
  }
  return jar;
}

export function isEmptyJar(jar: CookieJar) {
  return !Object.keys(jar).some(name => !name.startsWith("__nrh_") && name !== "wp_rest");
}

export function encodeJar(jar: CookieJar): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionKey(), iv);
  cipher.setAAD(SESSION_AAD);
  const backendJar = Object.fromEntries(Object.entries(sanitizeJar(jar)).filter(([name]) => !name.startsWith("__nrh_")));
  const payload = JSON.stringify({
    id: getSessionId(jar) || randomUUID(), jar: backendJar,
    expires: Date.now() + getAuthConfig().sessionCookieMaxAge * 1000,
  });
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const value = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
  if (value.length > 3800) throw new Error("WordPress session exceeds the cookie size limit");
  return value;
}

export function decodeJar(value: string | undefined): CookieJar {
  if (!value || value.length > 3800) return {};
  try {
    const bytes = Buffer.from(value, "base64url");
    if (bytes.length < 29) return {};
    const decipher = createDecipheriv("aes-256-gcm", sessionKey(), bytes.subarray(0, 12));
    decipher.setAAD(SESSION_AAD);
    decipher.setAuthTag(bytes.subarray(12, 28));
    const payload = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"));
    if (!Number.isSafeInteger(payload.expires) || payload.expires <= Date.now() ||
        typeof payload.id !== "string" || !validSessionId.test(payload.id)) return {};
    const jar = sanitizeJar(payload.jar);
    return isEmptyJar(jar) ? {} : { ...jar, [SESSION_ID]: payload.id };
  } catch {
    // Old unsigned cookies, tampering, wrong keys and expired cookies are guests.
    return {};
  }
}

export function jarToCookieHeader(jar: CookieJar) {
  return Object.entries(sanitizeJar(jar))
    .filter(([name]) => !name.startsWith("__nrh_") && name !== "wp_rest")
    .map(([name, value]) => `${name}=${value}`).join("; ");
}

export function mergeSetCookies(jar: CookieJar, setCookies: string[]): CookieJar {
  const next = sanitizeJar(jar);
  for (const raw of setCookies) {
    const [pair, ...attributes] = raw.split(";");
    const separator = pair.indexOf("=");
    if (separator < 1) continue;
    const name = pair.slice(0, separator).trim();
    if (name.startsWith("__nrh_") || name === "wp_rest") continue;
    const value = pair.slice(separator + 1).trim();
    const expired = attributes.some(attribute => {
      const [key, ...rest] = attribute.trim().split("=");
      const attrValue = rest.join("=");
      return (key.toLowerCase() === "max-age" && Number(attrValue) <= 0) ||
        (key.toLowerCase() === "expires" && Date.parse(attrValue) <= Date.now());
    });
    if (!value || expired) delete next[name];
    else Object.assign(next, sanitizeJar({ [name]: value }));
  }
  return next;
}

export function readJarFromRequest(request: NextRequest) {
  return decodeJar(request.cookies.get(getSessionCookieName())?.value);
}

export async function readJarFromCookies() {
  return decodeJar((await cookies()).get(getSessionCookieName())?.value);
}

function cookieOptions(maxAge = getAuthConfig().sessionCookieMaxAge) {
  return { httpOnly: true, secure: getAuthConfig().cookieSecure, sameSite: "lax" as const, path: "/", maxAge };
}

export function applyJar(response: NextResponse, jar: CookieJar) {
  if (isEmptyJar(jar)) throw new Error("Cannot create an authenticated session without backend cookies");
  response.cookies.set(getSessionCookieName(), encodeJar(jar), cookieOptions());
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(getSessionCookieName(), "", cookieOptions(0));
  return response;
}
