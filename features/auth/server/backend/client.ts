import "server-only";

import { randomUUID } from "node:crypto";
import { boundedJson, boundedText } from "@/lib/http/bounded-json";
import { getAuthConfig } from "../config";
import { isEmptyJar,jarToCookieHeader,mergeSetCookies,type CookieJar } from "../cookies";
import { resolveAuthNonceUrl,resolveAuthUrl,type AuthEndpointName } from "../endpoints";
import { authError,mapBackendErrorCode } from "./errors";

interface BackendRequestOptions {
  endpoint: AuthEndpointName;
  method?: "GET" | "POST";
  body?: unknown;
  jar?: CookieJar;
  signal?: AbortSignal;
  context: string;
}

function privateReadUrl(value: string) {
  const url = new URL(value);
  url.searchParams.set("_nrh_request", randomUUID());
  return url;
}

function rejectCachedResponse(response: Response) {
  const status = ["X-LiteSpeed-Cache", "CF-Cache-Status", "X-Cache"].map(name => response.headers.get(name)).join(" ");
  if (/hit|stale|updating|revalidated/i.test(status) || Number(response.headers.get("Age")) > 0) {
    throw new Error("Cached authentication response");
  }
}

async function refreshNonce(jar: CookieJar): Promise<CookieJar> {
  let response: Response;
  let nonce: string;
  try {
    const url = resolveAuthNonceUrl();
    response = await fetch(privateReadUrl(url), {
      headers: { Origin: new URL(url).origin, Cookie: jarToCookieHeader(jar), "Cache-Control": "no-cache, no-store", Pragma: "no-cache" },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(getAuthConfig().timeoutMs),
    });
    rejectCachedResponse(response);
    nonce = (await boundedText(response, 128)).trim();
  } catch { throw authError("backend_unavailable"); }
  if (!response.ok || !/^[a-f0-9]{10}$/i.test(nonce)) {
    // Core admin-ajax returns 400/0 for the unregistered anonymous action.
    // A policy denial or malformed nonce response does not prove session expiry.
    throw authError(response.status === 400 && nonce === "0" ? "session_expired" : "backend_unavailable");
  }
  return { ...mergeSetCookies(jar, response.headers.getSetCookie()), wp_rest: nonce };
}

export async function backendRequest(options: BackendRequestOptions): Promise<{ data: unknown; jar: CookieJar }> {
  let jar = options.jar || {};
  // WordPress resets the REST user to anonymous if a cookie request has no nonce.
  // Bootstrap via WordPress's authenticated core AJAX action; keep it server-only.
  if (!isEmptyJar(jar) && !jar.wp_rest) jar = await refreshNonce(jar);
  for (let attempt = 0; attempt < 2; attempt++) {
    const timeout = AbortSignal.timeout(getAuthConfig().timeoutMs);
    const headers: Record<string, string> = { Accept: "application/json", "Cache-Control": "no-cache, no-store", Pragma: "no-cache" };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (!isEmptyJar(jar)) headers.Cookie = jarToCookieHeader(jar);
    if (jar.wp_rest) headers["X-WP-Nonce"] = jar.wp_rest;
    let response: Response;
    let data: unknown;
    try {
      const url = resolveAuthUrl(options.endpoint);
      // Boom checks its WordPress origin, including on public OTP requests.
      // The BFF validates the browser origin separately; derive this upstream header
      // from the configured destination and never from incoming browser headers.
      headers.Origin = new URL(url).origin;
      response = await fetch(options.method === "GET" ? privateReadUrl(url) : url, {
        method: options.method || "POST", headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        cache: "no-store", redirect: "error",
        signal: options.signal ? AbortSignal.any([timeout, options.signal]) : timeout,
      });
      rejectCachedResponse(response);
      data = await boundedJson(response, 64 * 1024);
    } catch {
      console.error(`[auth:${options.context}] WordPress request failed`);
      throw authError("backend_unavailable");
    }
    const record = data && typeof data === "object" ? data as Record<string, unknown> : null;
    if (!record) throw authError("backend_unavailable", { status: 502 });
    if (record.code === "rest_cookie_invalid_nonce" && attempt === 0 && !isEmptyJar(jar)) {
      jar = await refreshNonce(jar);
      continue;
    }
    if (!response.ok || record.success === false || record.ok === false || record.error || record.status === "failed") {
      const rawCode = typeof record.code === "string" ? record.code : "";
      const message = typeof record.message === "string" ? record.message : typeof record.error === "string" ? record.error : "";
      let code = mapBackendErrorCode(rawCode, message, response.status);
      if (options.endpoint === "me" && response.status === 401 && code !== "configuration_error") code = "session_expired";
      if (options.endpoint === "login" && response.status < 500 &&
          !["rate_limited", "account_disabled", "configuration_error", "backend_unavailable", "session_expired"].includes(code)) code = "invalid_credentials";
      throw authError(code);
    }
    const nonce = response.headers.get("X-WP-Nonce");
    return {
      data,
      jar: { ...mergeSetCookies(jar, response.headers.getSetCookie()), ...(nonce && /^[a-f0-9]{10}$/i.test(nonce) ? { wp_rest: nonce } : {}) },
    };
  }
  throw authError("session_expired");
}
