/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Playwright test. */
// UI recovery responses are isolated; real WordPress session/authorization checks
// use a session obtained with the account owner's SMS code during the live audit.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require(process.env.AUTH_PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.AUTH_TEST_URL || "http://localhost:3000";
let browser;

async function openLogin(page) {
  await page.goto(`${origin}/?auth=login`, { waitUntil: "commit" });
  await page.getByRole("dialog").waitFor();
}

async function run() {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${origin}/dashboard`, { waitUntil: "commit" });
  await page.getByRole("dialog").waitFor();
  assert.equal(await page.getByRole("heading", { name: "داشبورد کاربری" }).count(), 0);
  console.log("PASS: anonymous dashboard access redirects to login");

  await page.getByLabel("شماره موبایل، ایمیل یا نام کاربری", { exact: true }).fill("audit-user@example.com");
  await page.getByRole("button", { name: "ادامه ورود", exact: true }).click();
  await page.getByLabel("رمز عبور", { exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "ورود با کد تایید (پیامکی)" }).count(), 0);
  await page.getByRole("button", { name: "ساخت حساب جدید" }).click();
  await page.getByRole("textbox", { name: "ایمیل", exact: true }).waitFor();
  assert.equal(await page.getByRole("textbox", { name: "ایمیل", exact: true }).inputValue(), "audit-user@example.com");
  await page.getByRole("button", { name: "ایجاد حساب و ورود" }).click();
  await page.getByText("شماره موبایل معتبر نیست.", { exact: true }).waitFor();
  console.log("PASS: explicit registration includes required email and validates missing fields");

  await page.getByRole("button", { name: "بستن پنجره ورود" }).click();
  await openLogin(page);
  await page.getByLabel("شماره موبایل، ایمیل یا نام کاربری", { exact: true }).fill("audit-user@example.com");
  await page.getByRole("button", { name: "ادامه ورود", exact: true }).click();
  await page.getByRole("button", { name: "رمز عبور خود را فراموش کرده‌اید؟" }).click();
  await page.getByRole("textbox", { name: "ایمیل", exact: true }).waitFor();
  const recoveryCalls = [];
  await page.route("**/api/auth/forgot-password-email", async route => {
    recoveryCalls.push({ path: "forgot-password-email", body: route.request().postDataJSON() });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.route("**/api/auth/reset-password-email", async route => {
    recoveryCalls.push({ path: "reset-password-email", body: route.request().postDataJSON() });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "password-reset" }) });
  });
  await page.getByRole("button", { name: "دریافت کد بازیابی" }).click();
  await page.getByLabel("کد بازیابی 6 رقمی").waitFor();
  await page.getByLabel("کد بازیابی 6 رقمی").fill("123456");
  await page.getByLabel("رمز عبور جدید", { exact: true }).fill("test-only-password");
  await page.getByLabel("تکرار رمز عبور جدید", { exact: true }).fill("test-only-password");
  await page.getByRole("button", { name: "ذخیره رمز جدید" }).click();
  await page.getByText("رمز عبور تغییر کرد. با رمز جدید وارد شوید.", { exact: true }).waitFor();
  assert.deepEqual(recoveryCalls.map(call => call.path), ["forgot-password-email", "reset-password-email"]);
  assert.equal(recoveryCalls[1].body.code, "123456");
  console.log("PASS: email recovery UI sends the code once with the new password");

  await page.getByRole("button", { name: "بستن پنجره ورود" }).click();
  await openLogin(page);
  await page.getByLabel("شماره موبایل، ایمیل یا نام کاربری", { exact: true }).fill("09123456789");
  await page.getByRole("button", { name: "ادامه ورود", exact: true }).click();
  await page.getByRole("button", { name: "ورود با کد تایید (پیامکی)" }).waitFor();
  await page.getByRole("button", { name: "رمز عبور خود را فراموش کرده‌اید؟" }).click();
  await page.route("**/api/auth/send-otp", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, expiresIn: 120, resendAfter: 120 }) }));
  await page.getByRole("button", { name: "دریافت کد بازیابی" }).click();
  await page.getByLabel("کد بازیابی 4 رقمی").waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(process.cwd(), ".next", "auth-recovery-mobile.png") });
  assert.ok(await page.getByRole("dialog").evaluate(element => element.getBoundingClientRect().width <= innerWidth));
  console.log("PASS: SMS recovery uses four digits and fits the mobile viewport");

  await page.getByRole("button", { name: "بستن پنجره ورود" }).click();
  await openLogin(page);
  await page.getByLabel("شماره موبایل، ایمیل یا نام کاربری", { exact: true }).fill("09123456789");
  await page.getByRole("button", { name: "ادامه ورود", exact: true }).click();
  const otpAttempts = [];
  await page.route("**/api/auth/verify-otp", async route => {
    otpAttempts.push(route.request().postDataJSON());
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: { code: "otp_invalid", message: "کد آزمایشی معتبر نیست." } }) });
  });
  await page.getByRole("button", { name: "ورود با کد تایید (پیامکی)" }).click();
  await page.getByLabel("کد تایید", { exact: true }).fill("۱۲۳۴");
  await page.getByText("کد آزمایشی معتبر نیست.", { exact: true }).waitFor();
  assert.deepEqual(otpAttempts, [{ phone: "09123456789", code: "1234" }]);
  console.log("PASS: Persian SMS digits normalize and submit once without consuming a recovery code");
  assert.deepEqual(errors, []);
  await context.close();

  const cookieFile = process.env.AUTH_LIVE_COOKIE_FILE;
  if (cookieFile) {
    const pair = (await fs.readFile(cookieFile, "utf8")).trim();
    const separator = pair.indexOf("=");
    const authenticated = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await authenticated.addCookies([{ name: pair.slice(0, separator), value: pair.slice(separator + 1), url: origin, httpOnly: true, sameSite: "Lax" }]);
    const dashboard = await authenticated.newPage();
    await dashboard.goto(`${origin}/dashboard`, { waitUntil: "commit" });
    await dashboard.getByRole("heading", { name: "داشبورد کاربری" }).waitFor();
    assert.equal((await authenticated.request.get(`${origin}/api/auth/session`)).status(), 200);
    await dashboard.reload({ waitUntil: "commit" });
    await dashboard.getByRole("heading", { name: "داشبورد کاربری" }).waitFor();
    await dashboard.screenshot({ path: path.join(process.cwd(), ".next", "auth-dashboard-desktop.png") });
    console.log("PASS: real WordPress session grants dashboard access and survives reload");
    await dashboard.getByRole("button", { name: "خروج از حساب", exact: true }).click();
    await dashboard.waitForURL(url => url.pathname === "/", { waitUntil: "commit" });
    assert.equal((await authenticated.request.get(`${origin}/api/auth/session`)).status(), 401);
    assert.equal((await authenticated.request.get(`${origin}/api/auth/session`, { headers: { Cookie: pair } })).status(), 401);
    console.log("PASS: real logout revokes the session, including replay of the original cookie");
    await authenticated.close();
  }

  const forged = await browser.newContext();
  await forged.addCookies([{ name: "nrh_auth", value: "forged", url: origin, httpOnly: true }]);
  const unauthorized = await forged.newPage();
  await unauthorized.goto(`${origin}/dashboard`, { waitUntil: "commit" });
  await unauthorized.getByRole("dialog").waitFor();
  assert.equal(await unauthorized.getByRole("heading", { name: "داشبورد کاربری" }).count(), 0);
  console.log("PASS: forged cookies cannot bypass server authorization");
  await forged.close();
}

run().then(() => process.exitCode = 0, error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await Promise.race([browser?.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  process.exit(process.exitCode || 0);
});
