import "server-only";

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

async function refreshNonce(jar: CookieJar): Promise<CookieJar> {
  let response: Response;
  let nonce: string;
  try {
    response = await fetch(resolveAuthNonceUrl(), {
      headers: { Cookie: jarToCookieHeader(jar), "Cache-Control": "no-cache" },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(getAuthConfig().timeoutMs),
    });
    nonce = (await response.text()).trim();
  } catch { throw authError("backend_unavailable"); }
  if (!response.ok || !/^[a-f0-9]{10}$/i.test(nonce)) {
    throw authError([400, 401, 403].includes(response.status) || nonce === "0" ? "session_expired" : "backend_unavailable");
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
    const headers: Record<string, string> = { Accept: "application/json", "Cache-Control": "no-cache" };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (!isEmptyJar(jar)) headers.Cookie = jarToCookieHeader(jar);
    if (jar.wp_rest) headers["X-WP-Nonce"] = jar.wp_rest;
    let response: Response;
    let data: unknown;
    try {
      response = await fetch(resolveAuthUrl(options.endpoint), {
        method: options.method || "POST", headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        cache: "no-store", redirect: "error",
        signal: options.signal ? AbortSignal.any([timeout, options.signal]) : timeout,
      });
      data = await response.json();
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
      if (options.endpoint === "me" && [401, 403].includes(response.status)) code = "session_expired";
      if (options.endpoint === "login" && response.status < 500 && !["rate_limited", "account_disabled"].includes(code)) code = "invalid_credentials";
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
