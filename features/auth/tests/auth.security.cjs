/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node security tests. */
const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const load = require("./auth-test-loader.cjs");
process.env.NODE_ENV = "test";
process.env.AUTH_SESSION_SECRET = crypto.randomBytes(32).toString("hex");
process.env.AUTH_SESSION_DATA_DIR = path.join(process.cwd(), ".next", `auth-test-sessions-${crypto.randomUUID()}`);
after(async () => {
  const directory = path.join(process.env.AUTH_SESSION_DATA_DIR, "revoked");
  for (const file of await fs.readdir(directory).catch(() => [])) await fs.unlink(path.join(directory, file));
  await fs.rmdir(directory).catch(() => {});
  await fs.rmdir(process.env.AUTH_SESSION_DATA_DIR).catch(() => {});
});
process.env.WP_AUTH_BASE_URL = "http://127.0.0.1:49999/wp-json";
process.env.WP_AUTH_NAMESPACE = "boom/v1";
const { NextRequest, NextResponse } = require("next/server");
const cookies = load("features/auth/server/cookies.ts");
const contract = load("features/auth/contracts.ts");
const { clearAllRateLimits } = load("lib/server/rate-limit.ts");
const { authAdapter } = load("features/auth/server/backend/adapter.ts");
const routes = Object.fromEntries([
  "login", "register", "send-otp", "verify-otp", "reset-password", "forgot-password-email", "reset-password-email", "session", "logout",
].map(name => [name, load(`app/api/auth/${name}/route.ts`)]));

const nonce = "abc123def4";
const jar = { wordpress_logged_in_test: "session%7Cvalid", wordpress_sec_test: "secure%7Cvalid", wp_rest: nonce };
const user = { id: 47, name: "Test Customer", slug: "09123456789", email: "test@example.com" };
let scenario;
let calls;
let upstreamRevoked;

function json(data, status = 200, headers = {}) { return Response.json(data, { status, headers }); }
function authenticated(data = { success: true }) {
  const headers = new Headers();
  headers.append("Set-Cookie", "wordpress_logged_in_test=session%7Cvalid; Path=/; HttpOnly");
  headers.append("Set-Cookie", "wordpress_sec_test=secure%7Cvalid; Path=/; HttpOnly");
  headers.append("Set-Cookie", "me=untrusted-client-profile-cache; Path=/");
  return json(data, 200, headers);
}

global.fetch = async (input, options = {}) => {
  const url = new URL(String(input));
  const headers = new Headers(options.headers);
  const body = options.body ? JSON.parse(options.body) : undefined;
  calls.push({ url, headers, body, method: options.method || "GET" });
  assert.equal(headers.get("origin"), url.origin, "upstream origin must come from the configured WordPress destination");
  if (url.pathname.endsWith("admin-ajax.php")) {
    assert.equal(url.searchParams.get("action"), "rest-nonce");
    assert.ok(headers.get("cookie").includes("wordpress_logged_in_test"));
    if (scenario === "logout-nonce-denied") return new Response("0", { status: 403 });
    if (scenario === "cached-nonce") return new Response(nonce, { headers: { 'X-LiteSpeed-Cache': 'hit' } });
    if (scenario === "large-nonce") return new Response(' '.repeat(129) + nonce);
    return new Response(nonce);
  }
  const endpoint = url.pathname.split("/").pop();
  assert.equal(url.origin, new URL(process.env.WP_AUTH_BASE_URL).origin);
  assert.ok(url.pathname.startsWith("/wp-json/boom/v1/"));
  assert.equal(options.cache, "no-store");
  assert.equal(options.redirect, "error");
  if (endpoint === "send-otp") {
    if (scenario === "origin-denied") return json({ code: "boom_bad_origin", message: "Request origin rejected" }, 403);
    if (scenario === "policy-denied") return json({ code: "rest_forbidden", message: "Request denied by backend policy" }, 403);
    await new Promise(resolve => setTimeout(resolve, 25));
    return json({ success: true });
  }
  if (endpoint === "verify-otp") {
    if (scenario === "otp-backend-outage") return json({ code: "wrong_otp", message: "OTP backend failure" }, 503);
    return scenario === "bad-code" ? json({ error: "کد اشتباه است یا منقضی شده" }, 403) : authenticated();
  }
  if (endpoint === "login" || endpoint === "register") {
    if (scenario === "origin-denied") return json({ code: "boom_bad_origin" }, 403);
    if (scenario === "cached-login") {
      const response = authenticated(); response.headers.set('CF-Cache-Status', 'HIT'); return response;
    }
    if (scenario === "large-login") return json({ success: true, padding: 'x'.repeat(65536) });
    if (scenario === "invalid-login") return json({ success: false, message: "incorrect_password" }, 401);
    if (scenario === "no-cookie") return json({ success: true, user_id: 47 });
    if (scenario === "false-success") return json({ success: false, message: "incorrect_password" });
    return authenticated();
  }
  if (endpoint === "sync-session" || endpoint === "me" || endpoint === "logout") {
    assert.ok(headers.get("cookie").includes("wordpress_logged_in_test"));
    if (scenario === "origin-denied") return json({ code: "boom_bad_origin" }, 403);
    if (scenario === "policy-denied") return json({ code: "rest_forbidden" }, 403);
    if (scenario === "logout-nonce-denied" && endpoint === "me") return json({ code: "rest_cookie_invalid_nonce" }, 403);
    if (upstreamRevoked && endpoint === "me") return json({ code: "not_logged_in" }, 401);
    if (scenario === "expired") return json({ code: "not_logged_in", message: "User not logged in" }, 401);
    if (scenario === "outage") return json({ message: "private backend error with secret details" }, 503);
    if (headers.get("X-WP-Nonce") !== nonce) return json({ code: "rest_cookie_invalid_nonce" }, 403);
    if (endpoint === "logout" && scenario === "upstream-revocation") upstreamRevoked = true;
    if (endpoint === "me") {
      if (scenario === "cached-me") return json(user, 200, { 'Age': '60' });
      if (scenario === "large-me") return json({ ...user, padding: 'x'.repeat(65536) });
      return json(scenario === "invalid-user" ? { name: "Fake", slug: "09123456789" } : user, 200, { "X-WP-Nonce": nonce });
    }
    return json({ success: true, wp_logged_in: true });
  }
  if (endpoint === "forgot-password-email" && scenario === "missing-email") return json({ code: "user_not_found" }, 404);
  return json({ success: true });
};

beforeEach(() => {
  delete process.env.VERCEL;
  scenario = "success";
  calls = [];
  upstreamRevoked = false;
  clearAllRateLimits();
  load.setCookieSnapshot({});
});

function request(name, data, options = {}) {
  return new NextRequest(`http://localhost:3000/api/auth/${name}`, {
    method: name === "session" ? "GET" : "POST",
    headers: { Origin: "http://localhost:3000", ...(data === undefined ? {} : { "Content-Type": "application/json" }), ...options.headers },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}
function sessionCookie(input = jar) { return `nrh_auth=${cookies.encodeJar(input)}`; }
async function invoke(name, data, options) { return routes[name][name === "session" ? "GET" : "POST"](request(name, data, options)); }

test("session cookie encrypts backend credentials and rejects tampering, unsigned data, rotation and expiry", () => {
  const token = cookies.encodeJar(jar);
  const decoded = cookies.decodeJar(token);
  assert.ok(cookies.getSessionId(decoded));
  assert.deepEqual(Object.fromEntries(Object.entries(decoded).filter(([name]) => !name.startsWith("__nrh_"))), jar);
  assert.ok(!token.includes("session%7Cvalid"));
  const bytes = Buffer.from(token, "base64url");
  bytes[bytes.length - 1] ^= 1;
  assert.deepEqual(cookies.decodeJar(bytes.toString("base64url")), {});
  assert.deepEqual(cookies.decodeJar(Buffer.from(JSON.stringify(jar)).toString("base64url")), {});
  const originalSecret = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = crypto.randomBytes(32).toString("hex");
  assert.deepEqual(cookies.decodeJar(token), {});
  process.env.AUTH_SESSION_SECRET = originalSecret;
  const originalNow = Date.now;
  Date.now = () => originalNow() + 15 * 24 * 60 * 60 * 1000;
  try { assert.deepEqual(cookies.decodeJar(token), {}); } finally { Date.now = originalNow; }
});

test("cookie headers reject injection and expired upstream cookies; production cookie is HttpOnly and Secure", () => {
  assert.equal(cookies.jarToCookieHeader({ bad: "x; injected=true", valid: "ok", injected: "\r\nCookie: evil" }), "valid=ok");
  assert.deepEqual(cookies.mergeSetCookies({ old: "x" }, ["old=expired; Expires=Thu, 01 Jan 1970 00:00:00 GMT"]), {});
  process.env.NODE_ENV = "production";
  try {
    const response = cookies.applyJar(NextResponse.json({ ok: true }), jar);
    const header = response.headers.get("set-cookie");
    assert.ok(header.includes("HttpOnly") && header.includes("Secure") && header.includes("SameSite=lax"));
  } finally { process.env.NODE_ENV = "test"; }
});

test("phone and OTP validation accepts Persian digits, rejects letters and separates four/six-digit codes", () => {
  assert.equal(contract.iranMobileSchema.parse("+۹۸۹۱۲۳۴۵۶۷۸۹"), "09123456789");
  assert.ok(!contract.iranMobileSchema.safeParse("garbage09123456789").success);
  assert.equal(contract.otpCodeSchema.parse("۱۲۳۴"), "1234");
  assert.ok(!contract.otpCodeSchema.safeParse("1x234").success);
  assert.ok(!contract.otpCodeSchema.safeParse("12345").success);
  assert.equal(contract.emailOtpCodeSchema.parse("۱۲۳۴۵۶"), "123456");
  assert.ok(!contract.emailOtpCodeSchema.safeParse("1234").success);
  assert.ok(contract.loginRequestSchema.safeParse({ identifier: "customer", password: "123456" }).success);
});

test("redirect destinations cannot leave this site", () => {
  for (const value of ["javascript:alert(1)", "//evil.example", "/\\evil.example", "https://evil.example", "/\n/evil.example"]) {
    assert.equal(contract.safeAuthNextPath(value), null);
  }
  assert.equal(contract.safeAuthNextPath("/dashboard?tab=orders"), "/dashboard?tab=orders");
});

test("login bootstraps nonce, syncs session, verifies /me and exposes only a safe DTO", async () => {
  const response = await invoke("login", { identifier: "customer", password: "123456" });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "authenticated");
  assert.equal(body.session.user.id, "47");
  assert.ok(!JSON.stringify(body).includes("wordpress_logged_in"));
  assert.ok(response.headers.get("cache-control").includes("no-store"));
  assert.deepEqual(calls.map(call => call.url.pathname.split("/").pop()), ["login", "admin-ajax.php", "sync-session", "me"]);
  assert.deepEqual(calls[0].body, { username: "customer", password: "123456" });
});

test("cached or oversized login, nonce and profile responses never authenticate or issue a cookie", async () => {
  for (const mode of ['cached-login', 'cached-nonce', 'cached-me', 'large-login', 'large-nonce', 'large-me']) {
    scenario = mode;
    const response = await invoke('login', { identifier: mode, password: 'test-password' });
    assert.equal(response.status, 503, mode);
    assert.equal(response.headers.get('set-cookie'), null, mode);
    assert.doesNotMatch(await response.text(), /session%7Cvalid|padding|wordpress_logged_in/);
  }
});

test("profile and REST nonce reads use unique URLs and forbid intermediary storage", async () => {
  await invoke('login', { identifier: 'customer', password: 'test-password' });
  const first = calls.filter(call => call.method === 'GET');
  await invoke('login', { identifier: 'customer', password: 'test-password' });
  const all = calls.filter(call => call.method === 'GET');
  assert.equal(new Set(all.map(call => call.url.href)).size, all.length);
  assert.equal(first.length, 2);
  for (const call of all) {
    assert.ok(call.url.searchParams.get('_nrh_request'));
    assert.equal(call.headers.get('cache-control'), 'no-cache, no-store');
  }
});

test("registration sends actual WordPress fields including the required email", async () => {
  const input = { phone: "09123456789", email: "test@example.com", firstName: "Test", lastName: "Customer", password: "safe-test-password" };
  const response = await invoke("register", input);
  assert.equal(response.status, 200);
  assert.deepEqual(calls[0].body, { name: "Test Customer", phone: input.phone, email: input.email, password: input.password });
  const invalid = await invoke("register", { ...input, email: undefined });
  assert.equal(invalid.status, 400);
});

test("successful HTTP responses with no session, success:false or an invalid /me user never authenticate", async () => {
  for (const mode of ["no-cookie", "false-success", "invalid-user"]) {
    scenario = mode;
    const response = await invoke("login", { identifier: `customer-${mode}`, password: "123456" });
    assert.ok(response.status >= 400);
    assert.equal(response.headers.get("set-cookie"), null);
  }
});

test("CSRF, incorrect content type, mass assignment and oversized JSON fail before reaching WordPress", async () => {
  const input = { identifier: "customer", password: "password" };
  assert.equal((await invoke("login", input, { headers: { Origin: "https://evil.example" } })).status, 403);
  assert.equal((await invoke("login", input, { headers: { "sec-fetch-site": "cross-site" } })).status, 403);
  assert.equal((await invoke("login", input, { headers: { "Content-Type": "text/plain" } })).status, 415);
  assert.equal((await invoke("login", { ...input, role: "administrator" })).status, 400);
  assert.equal((await invoke("login", { identifier: "x".repeat(9000), password: "password" })).status, 413);
  assert.equal(calls.length, 0);
});

test("concurrent OTP sends cannot bypass cooldown", async () => {
  const input = { phone: "09123456789", purpose: "login" };
  const results = await Promise.all([invoke("send-otp", input), invoke("send-otp", input)]);
  assert.deepEqual(results.map(response => response.status).sort(), [200, 429]);
  assert.equal(calls.filter(call => call.url.pathname.endsWith("send-otp")).length, 1);
  assert.ok(results.find(response => response.status === 429).headers.get("retry-after"));
});

test("origin and unknown policy denials during OTP sending never become invalid-code errors", async () => {
  for (const [mode, expected] of [["origin-denied", "configuration_error"], ["policy-denied", "backend_unavailable"]]) {
    scenario = mode;
    clearAllRateLimits();
    const response = await invoke("send-otp", { phone: "09123456789", purpose: "login" });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, expected);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(calls.filter(call => call.url.pathname.endsWith("verify-otp")).length, 0);
  }
});

test("origin failures during login and session reads stay configuration errors without changing cookies", async () => {
  scenario = "origin-denied";
  for (const [name, body, options] of [
    ["login", { identifier: "customer", password: "test-password" }, {}],
    ["session", undefined, { headers: { Cookie: sessionCookie() } }],
  ]) {
    const response = await invoke(name, body, options);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, "configuration_error");
    assert.equal(response.headers.get("set-cookie"), null);
  }
});

test("backend outages and unknown session policy failures are not mistaken for user credential errors", async () => {
  scenario = "otp-backend-outage";
  const verify = await invoke("verify-otp", { phone: "09123456789", code: "1234" });
  assert.equal(verify.status, 503);
  assert.equal((await verify.json()).error.code, "backend_unavailable");
  scenario = "policy-denied";
  const session = await invoke("session", undefined, { headers: { Cookie: sessionCookie() } });
  assert.equal(session.status, 503);
  assert.equal((await session.json()).error.code, "backend_unavailable");
  assert.equal(session.headers.get("set-cookie"), null);
});

test("Vercel logout revokes and checks the original WordPress session without local storage", async () => {
  const previousDirectory = process.env.AUTH_SESSION_DATA_DIR;
  process.env.VERCEL = "1";
  process.env.AUTH_SESSION_DATA_DIR = __filename; // A file cannot be a writable session directory.
  scenario = "upstream-revocation";
  const replay = sessionCookie();
  try {
    const response = await invoke("logout", {}, { headers: { Cookie: replay } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
    assert.deepEqual(calls.map(call => call.url.pathname.split('/').pop()), ["logout", "me"]);
    assert.equal((await invoke("session", undefined, { headers: { Cookie: replay } })).status, 401);
  } finally {
    delete process.env.VERCEL;
    process.env.AUTH_SESSION_DATA_DIR = previousDirectory;
  }
});

test("Vercel never reports logout success when WordPress leaves the original session valid", async () => {
  const previousDirectory = process.env.AUTH_SESSION_DATA_DIR;
  process.env.VERCEL = "1";
  process.env.AUTH_SESSION_DATA_DIR = __filename;
  const replay = sessionCookie();
  try {
    const response = await invoke("logout", {}, { headers: { Cookie: replay } });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal((await invoke("session", undefined, { headers: { Cookie: replay } })).status, 200);
  } finally {
    delete process.env.VERCEL;
    process.env.AUTH_SESSION_DATA_DIR = previousDirectory;
  }
});

test("production on a non-Vercel host revokes WordPress sessions without local files", async () => {
  const directory = process.env.AUTH_SESSION_DATA_DIR, environment = process.env.NODE_ENV, platform = process.env.VERCEL, base = process.env.WP_AUTH_BASE_URL;
  process.env.NODE_ENV = 'production'; delete process.env.VERCEL; process.env.AUTH_SESSION_DATA_DIR = __filename;
  process.env.WP_AUTH_BASE_URL = 'https://wp.production.example.test/wp-json';
  scenario = 'upstream-revocation';
  const replay = sessionCookie();
  try {
    const r = await invoke('logout', {}, { headers: { Cookie: replay } });
    assert.equal(r.status, 200); assert.equal((await invoke('session', undefined, { headers: { Cookie: replay } })).status, 401);
  } finally {
    process.env.AUTH_SESSION_DATA_DIR = directory;
    process.env.WP_AUTH_BASE_URL = base;
    if (environment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = environment;
    if (platform === undefined) delete process.env.VERCEL; else process.env.VERCEL = platform;
  }
});

test("Vercel logout does not mistake a blocked nonce endpoint for authoritative session revocation", async () => {
  process.env.VERCEL = "1";
  scenario = "logout-nonce-denied";
  try {
    const response = await invoke("logout", {}, { headers: { Cookie: sessionCookie() } });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, "backend_unavailable");
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    delete process.env.VERCEL;
  }
});

test("OTP attempts and password attempts have enforced server-side limits", async () => {
  scenario = "bad-code";
  for (let i = 0; i < 5; i++) assert.ok((await invoke("verify-otp", { phone: "09123456789", code: "1234" })).status >= 400);
  assert.equal((await invoke("verify-otp", { phone: "09123456789", code: "1234" })).status, 429);
  clearAllRateLimits();
  scenario = "invalid-login";
  for (let i = 0; i < 8; i++) assert.equal((await invoke("login", { identifier: "customer", password: "wrong" })).status, 401);
  assert.equal((await invoke("login", { identifier: "customer", password: "wrong" })).status, 429);
});

test("password recovery submits OTP once with the password and clears the local session", async () => {
  const original = sessionCookie();
  const response = await invoke("reset-password", { phone: "09123456789", code: "1234", password: "new-safe-password" }, { headers: { Cookie: original } });
  assert.equal(response.status, 200);
  assert.deepEqual(calls.map(call => call.url.pathname.split("/").pop()), ["reset-password"]);
  assert.deepEqual(calls[0].body, { phone: "09123456789", otp: "1234", password: "new-safe-password" });
  assert.ok(response.headers.get("set-cookie").includes("Max-Age=0"));
  assert.equal((await invoke("session", undefined, { headers: { Cookie: original } })).status, 401);
  const emailResponse = await invoke("reset-password-email", { email: "test@example.com", code: "123456", password: "new-safe-password" });
  assert.equal(emailResponse.status, 200);
});

test("email recovery does not reveal whether an account exists", async () => {
  const existing = await invoke("forgot-password-email", { email: "known@example.com" });
  scenario = "missing-email";
  const missing = await invoke("forgot-password-email", { email: "missing@example.com" });
  assert.equal(existing.status, missing.status);
  assert.deepEqual(await existing.json(), await missing.json());
});

test("session reads reject invalid cookies without reaching WordPress or mutating browser cookies", async () => {
  let response = await invoke("session", undefined, { headers: { Cookie: "nrh_auth=forged" } });
  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
  assert.equal(response.headers.get('set-cookie'), null);
  scenario = "outage";
  response = await invoke("session", undefined, { headers: { Cookie: sessionCookie() } });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.ok(!JSON.stringify(await response.json()).includes("secret details"));
});

test("expired nonce renews through WordPress before retrying /me", async () => {
  const response = await invoke("session", undefined, { headers: { Cookie: sessionCookie({ ...jar, wp_rest: "0000000000" }) } });
  assert.equal(response.status, 200);
  assert.deepEqual(calls.map(call => call.url.pathname.split("/").pop()), ["me", "admin-ajax.php", "me"]);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(calls.at(-1).headers.get('X-WP-Nonce'), nonce);
});

test("DAL verifies the actual backend user and never accepts cookie presence as authorization", async () => {
  const { requireUser } = load("features/auth/server/dal.ts");
  load.setCookieSnapshot({ nrh_auth: "forged" });
  await assert.rejects(requireUser("/dashboard"), error => error.digest?.includes("NEXT_REDIRECT"));
  load.setCookieSnapshot({ nrh_auth: cookies.encodeJar(jar) });
  assert.equal((await requireUser("/dashboard")).id, "47");
  scenario = "expired";
  await assert.rejects(requireUser("/dashboard"), error => error.digest?.includes("NEXT_REDIRECT"));
});

test("logout clears the local cookie even when WordPress is temporarily unavailable", async () => {
  scenario = "outage";
  const response = await invoke("logout", undefined, { headers: { Cookie: sessionCookie() } });
  assert.equal(response.status, 200);
  assert.ok(response.headers.get("set-cookie").includes("Max-Age=0"));
});

test("logout revokes every encrypted version of the session, including through the DAL", async () => {
  const original = sessionCookie();
  const refreshed = await invoke("session", undefined, { headers: { Cookie: original } });
  assert.equal(refreshed.headers.get('set-cookie'), null);
  const rotated = `nrh_auth=${cookies.encodeJar(cookies.decodeJar(original.split('=')[1]))}`;
  assert.notEqual(original, rotated);
  const originalJar = cookies.decodeJar(original.split("=")[1]);
  const rotatedJar = cookies.decodeJar(rotated.split("=")[1]);
  assert.equal(cookies.getSessionId(originalJar), cookies.getSessionId(rotatedJar));
  assert.ok(!cookies.jarToCookieHeader(rotatedJar).includes("__nrh_"));
  assert.equal(cookies.getSessionId(cookies.mergeSetCookies(rotatedJar, ["__nrh_session_id=forged"])), cookies.getSessionId(originalJar));
  scenario = "outage";
  assert.equal((await invoke("logout", undefined, { headers: { Cookie: rotated } })).status, 200);
  calls = [];
  scenario = "success";
  for (const value of [original, rotated]) assert.equal((await invoke("session", undefined, { headers: { Cookie: value } })).status, 401);
  assert.equal(calls.length, 0);
  assert.ok((await fs.readFile(path.join(process.env.AUTH_SESSION_DATA_DIR, "revoked", `${cookies.getSessionId(originalJar)}.json`), "utf8")).length);
  load.setCookieSnapshot({ nrh_auth: original.split("=")[1] });
  await assert.rejects(load("features/auth/server/dal.ts").requireUser("/dashboard"), error => error.digest?.includes("NEXT_REDIRECT"));
});

test("revocation storage failure cannot report a successful logout", async () => {
  const originalDirectory = process.env.AUTH_SESSION_DATA_DIR;
  process.env.AUTH_SESSION_DATA_DIR = path.join(process.cwd(), "package.json");
  try {
    const response = await invoke("logout", undefined, { headers: { Cookie: sessionCookie() } });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(calls.length, 0);
  } finally { process.env.AUTH_SESSION_DATA_DIR = originalDirectory; }
});

test("unreadable revocation data cannot authorize a session or erase its cookie", async () => {
  const original = sessionCookie();
  const id = cookies.getSessionId(cookies.decodeJar(original.split("=")[1]));
  const directory = path.join(process.env.AUTH_SESSION_DATA_DIR, "revoked");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, `${id}.json`), "corrupted record");
  const response = await invoke("session", undefined, { headers: { Cookie: original } });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(calls.length, 0);
});

test("email-only users remain valid without fabricating a phone or user ID", async () => {
  const { extractUser } = load("features/auth/server/backend/mappers.ts");
  assert.equal(extractUser({ id: 12, name: "Email User", slug: "email-user", email: "user@example.com" }).phone, "");
  await assert.rejects(authAdapter.login({ identifier: "customer-no-session", password: "password" }).then(result => {
    assert.ok(result.user.id !== result.user.phone);
    scenario = "no-cookie";
    return authAdapter.login({ identifier: "customer-no-session", password: "password" });
  }));
});

test("missing session configuration rejects OTP before sending SMS and returns a safe actionable status", async () => {
  const secret = process.env.AUTH_SESSION_SECRET;
  delete process.env.AUTH_SESSION_SECRET;
  try {
    const response = await invoke("send-otp", { phone: "09123456789", purpose: "login" });
    const data = await response.json();
    assert.equal(response.status, 503);
    assert.equal(data.error.code, "configuration_error");
    assert.equal(calls.length, 0);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.ok(!JSON.stringify(data).includes("AUTH_SESSION_SECRET"));
    const session = await invoke("session");
    assert.equal(session.status, 503, "A configuration failure must not masquerade as an expired session");
  } finally { process.env.AUTH_SESSION_SECRET = secret; }
});
