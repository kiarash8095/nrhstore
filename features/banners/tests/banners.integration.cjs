/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS test. */
/* Run against the local development server: node tests/banners.integration.cjs
 * Uses configured local credentials without printing them. Published banners
 * are restored in finally, including whether the initial JSON existed.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");
require("@next/env").loadEnvConfig(process.cwd());

const origin = process.env.BANNERS_TEST_URL || "http://localhost:3000";
const dataDirectory = path.resolve(process.env.BANNERS_DATA_DIR || path.join(process.cwd(), "data", "banners"));
const configPath = path.join(dataDirectory, "banners.json");
let cookie = "";
let original;
let originalFile;
let uploadedFilename;
let changed = false;

async function request(url, { authenticated = false, ...options } = {}) {
  const headers = { ...options.headers };
  if (authenticated) headers.Cookie = cookie;
  return fetch(`${origin}${url}`, { ...options, headers, signal: AbortSignal.timeout(120000) });
}

async function save(document) {
  return request("/api/banners-admin", {
    authenticated: true, method: "PUT", headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(document),
  });
}

async function run() {
  try { originalFile = await fs.readFile(configPath); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  let response = await request("/api/banners");
  assert.equal(response.status, 200);
  original = await response.json();
  assert.ok(Array.isArray(original.banners));
  assert.equal(response.headers.get("cache-control"), "no-store");
  console.log("PASS: public banners are served without caching");

  response = await request("/api/banners-admin", { method: "PUT", body: "{}" });
  assert.equal(response.status, 401);
  response = await request("/api/banners-admin/upload", { method: "POST" });
  assert.equal(response.status, 401);
  response = await request("/api/banners-admin", { method: "PUT", headers: { Cookie: "nrh_auth=customer-session; nrh_banners_admin=forged" }, body: "{}" });
  assert.equal(response.status, 401);
  console.log("PASS: anonymous, customer and forged sessions cannot mutate banners");

  response = await request("/api/banners-admin/session", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ username: process.env.BANNERS_ADMIN_USERNAME, password: "invalid-password" }),
  });
  assert.equal(response.status, 401);
  response = await request("/api/banners-admin/session", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ username: process.env.BANNERS_ADMIN_USERNAME, password: process.env.BANNERS_ADMIN_PASSWORD }),
  });
  assert.equal(response.status, 200);
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie.includes("HttpOnly") && setCookie.includes("SameSite=strict"));
  cookie = setCookie.split(";")[0];
  console.log("PASS: login validates credentials and issues a protected cookie");

  const payload = Buffer.from(JSON.stringify({ expires: Date.now() - 1000, nonce: "expired-test" })).toString("base64url");
  const signature = crypto.createHmac("sha256", process.env.BANNERS_ADMIN_SESSION_SECRET)
    .update(JSON.stringify([payload, process.env.BANNERS_ADMIN_USERNAME, process.env.BANNERS_ADMIN_PASSWORD])).digest("base64url");
  response = await request("/api/banners-admin", { method: "PUT", headers: { Cookie: `nrh_banners_admin=${payload}.${signature}` }, body: "{}" });
  assert.equal(response.status, 401);
  response = await request("/api/banners-admin", { authenticated: true, method: "PUT", headers: { Origin: "https://untrusted.example" }, body: "{}" });
  assert.equal(response.status, 403);
  console.log("PASS: expired sessions and cross-origin mutations are rejected");

  response = await save({ revision: original.revision, banners: [{ ...original.banners[0], id: "bad", src: "https://untrusted.example/image.svg" }] });
  assert.equal(response.status, 400);
  response = await save({ revision: original.revision, banners: [original.banners[0], original.banners[0]] });
  assert.equal(response.status, 400);
  console.log("PASS: untrusted sources and duplicate banner IDs are rejected");

  const badImage = new FormData();
  badImage.append("file", new Blob(["not an image"], { type: "image/webp" }), "fake.webp");
  response = await request("/api/banners-admin/upload", { authenticated: true, method: "POST", headers: { Origin: origin }, body: badImage });
  assert.equal(response.status, 400);
  const bytes = await sharp({ create: { width: 320, height: 100, channels: 3, background: "#00a884" } }).png().toBuffer();
  const validImage = new FormData();
  validImage.append("file", new Blob([bytes], { type: "image/png" }), "banner.png");
  response = await request("/api/banners-admin/upload", { authenticated: true, method: "POST", headers: { Origin: origin }, body: validImage });
  assert.equal(response.status, 200);
  const image = await response.json();
  assert.equal(image.width, 320);
  assert.equal(image.height, 100);
  uploadedFilename = image.src.split("/").pop();
  assert.match(uploadedFilename, /^[a-f0-9-]{36}\.webp$/);
  response = await request(image.src);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/webp");
  assert.equal((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).format, "webp");
  const unchanged = await (await request("/api/banners")).json();
  assert.deepEqual(unchanged, original);
  console.log("PASS: uploads validate real image data and do not publish drafts");

  const revisedBanners = original.banners.slice(1).map((banner, index) => index === 0 ? { ...banner, title: "Integration test title" } : banner);
  revisedBanners.push({ id: "integration-test-banner", group: "gaming", title: "Integration upload", ...image });
  response = await save({ revision: original.revision, banners: revisedBanners });
  assert.equal(response.status, 200);
  changed = true;
  const saved = await response.json();
  assert.notEqual(saved.revision, original.revision);
  const published = await (await request("/api/banners")).json();
  assert.deepEqual(published.banners, revisedBanners);
  assert.deepEqual(JSON.parse(await fs.readFile(configPath, "utf8")), { revision: saved.revision, banners: revisedBanners });
  response = await save(original);
  assert.equal(response.status, 409);
  console.log("PASS: save publishes edits/deletions/uploads, persists to disk and rejects stale writes");

  response = await save({ revision: saved.revision, banners: [] });
  assert.equal(response.status, 200);
  assert.deepEqual((await (await request("/api/banners")).json()).banners, []);
  console.log("PASS: removing all banners persists an empty list");

  response = await request("/api/banner-images/not-a-file.webp");
  assert.equal(response.status, 404);
  response = await request("/api/banners-admin/session", { method: "POST", headers: { Origin: "https://untrusted.example" }, body: "{}" });
  assert.equal(response.status, 403);
  console.log("PASS: invalid image paths and cross-origin login are rejected");
} 

async function cleanup() {
  if (changed && original) {
    const current = await (await request("/api/banners")).json();
    const restored = await save({ revision: current.revision, banners: original.banners });
    assert.equal(restored.status, 200, "Failed to restore original banners");
    if (originalFile) {
      const temporaryPath = path.join(dataDirectory, `${crypto.randomUUID()}.tmp`);
      await fs.writeFile(temporaryPath, originalFile);
      await fs.rename(temporaryPath, configPath);
    } else {
      await fs.unlink(configPath);
    }
    assert.deepEqual(await (await request("/api/banners")).json(), original);
    console.log("PASS: original site configuration restored");
  }
  if (uploadedFilename) await fs.unlink(path.join(dataDirectory, "images", uploadedFilename));
  if (cookie) {
    const response = await request("/api/banners-admin/session", { method: "DELETE", headers: { Origin: origin }, authenticated: true });
    assert.equal(response.status, 200);
    assert.ok(response.headers.get("set-cookie").includes("Max-Age=0"));
    console.log("PASS: logout clears the admin cookie");
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  try { await cleanup(); } catch (error) { console.error("Cleanup failed:", error); process.exitCode = 1; }
  process.exit(process.exitCode || 0);
});
