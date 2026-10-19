/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS test. */
// Run with Playwright installed, or set BANNERS_PLAYWRIGHT_MODULE to a bundled
// Playwright path. Requires the local development server and .env.local.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");
const { chromium } = require(process.env.BANNERS_PLAYWRIGHT_MODULE || "playwright");
require("@next/env").loadEnvConfig(process.cwd());

const origin = process.env.BANNERS_TEST_URL || "http://localhost:3000";
const directory = path.resolve(process.env.BANNERS_DATA_DIR || path.join(process.cwd(), "data", "banners"));
const configPath = path.join(directory, "banners.json");
let originalFile;
let original;
let uploadedFilename;
let browser;
let context;
let editor;
const runtimeErrors = [];
let changed = false;

async function publicDocument() {
  return (await fetch(`${origin}/api/banners`)).json();
}

async function saveApi(document) {
  const response = await context.request.put(`${origin}/api/banners-admin`, { data: document, headers: { Origin: origin } });
  assert.equal(response.status(), 200);
  return response.json();
}

async function run() {
  try { originalFile = await fs.readFile(configPath); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  original = await publicDocument();
  assert.ok(original.banners.length >= 3, "Browser fixture requires at least three existing banners");
  browser = await chromium.launch({ headless: true, channel: process.env.BANNERS_BROWSER_CHANNEL || "msedge" });
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  editor = page;
  page.setDefaultTimeout(45000);
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.goto(`${origin}/banners-admin`, { waitUntil: "commit" });
  await page.getByRole("heading", { name: "ورود به مدیریت بنرها" }).waitFor();
  assert.ok(page.url().endsWith("/banners-admin/login"));
  await page.getByLabel("نام کاربری", { exact: true }).fill(process.env.BANNERS_ADMIN_USERNAME);
  await page.getByLabel("رمز عبور", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  await page.getByText("نام کاربری یا رمز عبور اشتباه است.", { exact: true }).first().waitFor();
  await page.getByLabel("رمز عبور", { exact: true }).fill(process.env.BANNERS_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  await page.getByRole("heading", { name: "مدیریت بنرهای فروشگاه" }).waitFor();
  assert.equal(await page.locator("article").count(), original.banners.length);
  console.log("PASS: protected page redirects, wrong login shows feedback, valid login renders all banners");

  const first = original.banners[0];
  const title = `Browser test ${crypto.randomUUID().slice(0, 8)}`;
  const titleInput = page.locator(`#title-${first.id}`);
  await titleInput.fill(title);
  await page.getByRole("button", { name: "ذخیره تغییرات", exact: true }).waitFor({ state: "visible" });
  await page.waitForFunction(() => ![...document.querySelectorAll("button")].find((button) => button.textContent.includes("ذخیره تغییرات"))?.disabled);
  assert.deepEqual(await publicDocument(), original);
  const home = await context.newPage();
  home.setDefaultTimeout(45000);
  await home.goto(origin, { waitUntil: "commit" });
  await home.locator(`img[alt="${first.title}"]`).first().waitFor();
  const [savedResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/banners-admin") && response.request().method() === "PUT"),
    page.getByRole("button", { name: "ذخیره تغییرات", exact: true }).click(),
  ]);
  assert.equal(savedResponse.status(), 200);
  changed = true;
  await page.getByRole("status").filter({ hasText: "تغییرات با موفقیت ذخیره شد" }).waitFor();
  assert.equal((await publicDocument()).banners[0].title, title);
  await home.getByRole("img", { name: title, exact: true }).first().waitFor();
  console.log("PASS: draft edits publish only on save, success toast appears, an open home tab updates");

  const bytes = await sharp({ create: { width: 600, height: 200, channels: 3, background: "#0f766e" } }).png().toBuffer();
  await page.locator(`#file-${first.id}`).setInputFiles({ name: "browser-test.png", mimeType: "image/png", buffer: bytes });
  await page.getByRole("status").filter({ hasText: "تصویر آماده شد" }).waitFor();
  assert.equal((await publicDocument()).banners[0].src, first.src);
  const beforeSecondSave = await publicDocument();
  const removed = original.banners.find((banner) => banner.group === "featured") || original.banners[1];
  await page.locator("article").filter({ has: page.locator(`#title-${removed.id}`) }).getByRole("button", { name: "حذف بنر" }).click();
  const [secondResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/banners-admin") && response.request().method() === "PUT"),
    page.getByRole("button", { name: "ذخیره تغییرات", exact: true }).click(),
  ]);
  assert.equal(secondResponse.status(), 200);
  const second = await publicDocument();
  const replaced = second.banners.find((banner) => banner.id === first.id);
  uploadedFilename = replaced.src.split("/").pop();
  assert.notEqual(replaced.src, first.src);
  assert.ok(!second.banners.some((banner) => banner.id === removed.id));
  assert.notEqual(second.revision, beforeSecondSave.revision);
  console.log("PASS: image replacement and deletion work through the editor");

  await page.getByRole("heading", { name: "مدیریت بنرهای فروشگاه" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(process.cwd(), ".next", "banners-admin-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("heading", { name: "مدیریت بنرهای فروشگاه" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(process.cwd(), ".next", "banners-admin-mobile.png") });
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scrollWidth <= dimensions.width, "Mobile viewport overflows horizontally");
  console.log("PASS: editor fits a 390px mobile viewport");

  await titleInput.fill("Unsaved draft during conflict");
  const external = await saveApi({ revision: second.revision, banners: second.banners });
  const [conflictResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/banners-admin") && response.request().method() === "PUT"),
    page.getByRole("button", { name: "ذخیره تغییرات", exact: true }).click(),
  ]);
  assert.equal(conflictResponse.status(), 409);
  await page.getByRole("alert").filter({ hasText: "بنرها در نشست دیگری تغییر کرده‌اند" }).first().waitFor();
  assert.equal(await titleInput.inputValue(), "Unsaved draft during conflict");
  assert.equal((await publicDocument()).revision, external.revision);
  console.log("PASS: failed saves show an error and preserve the draft");
  assert.deepEqual(runtimeErrors, [], "Browser runtime errors");
  await home.close();
}

async function cleanup() {
  if (changed && context) {
    const current = await publicDocument();
    await saveApi({ revision: current.revision, banners: original.banners });
    if (originalFile) {
      const temporaryPath = path.join(directory, `${crypto.randomUUID()}.tmp`);
      await fs.writeFile(temporaryPath, originalFile);
      await fs.rename(temporaryPath, configPath);
    } else await fs.unlink(configPath);
    assert.deepEqual(await publicDocument(), original);
    console.log("PASS: original site configuration restored after browser tests");
  }
  if (uploadedFilename && /^[a-f0-9-]{36}\.webp$/.test(uploadedFilename)) {
    await fs.unlink(path.join(directory, "images", uploadedFilename));
  }
  await browser?.close();
}

run().catch(async (error) => {
  console.error(error);
  console.log("Browser runtime errors:", runtimeErrors);
  if (editor) {
    console.log("Editor visible text:", await editor.locator("main").innerText().catch(() => "unavailable"));
    console.log("Input state:", await editor.locator('input[id^="title-"]').first().evaluate((input) => ({ value: input.value, editable: !input.matches(":disabled"), hydrated: Object.keys(input).some((key) => key.startsWith("__reactProps$")) })).catch(() => null));
    await editor.screenshot({ path: path.join(process.cwd(), ".next", "banners-admin-failure.png"), timeout: 5000 }).catch(() => undefined);
  }
  process.exitCode = 1;
}).finally(async () => {
  try { await cleanup(); } catch (error) { console.error("Cleanup failed:", error); process.exitCode = 1; await browser?.close(); }
  process.exit(process.exitCode || 0);
});
