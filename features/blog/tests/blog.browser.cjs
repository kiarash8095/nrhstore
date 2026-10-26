/* eslint-disable @typescript-eslint/no-require-imports -- Browser checks use real public articles and mocked account/comment writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const runtime = process.env.PLAYWRIGHT_MODULE || "playwright";
const { chromium } = require(runtime);
const { expect } = require(runtime + "/test");
const check = expect.configure({ timeout: 45000 });
const origin = process.env.BLOG_TEST_URL || "http://localhost:3116";
const artifacts = path.resolve("artifacts/blog");
const result = {
  browserErrors: [],
  screenshots: [],
  checks: [],
  realWrites: [],
};
let browser;
async function context(
  authenticated = false,
  viewport = { width: 1440, height: 1100 },
) {
  const ctx = await browser.newContext({ viewport });
  await ctx.route("**/api/auth/session", (route) =>
    route.fulfill({
      status: authenticated ? 200 : 401,
      contentType: "application/json",
      body: JSON.stringify(
        authenticated
          ? {
              status: "authenticated",
              session: {
                user: { id: "7", phone: "", firstName: "کاربر آزمایش" },
              },
            }
          : { error: { code: "session_expired", message: "Guest" } },
      ),
    }),
  );
  await ctx.route("**/api/cart", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await ctx.route("**/api/**", async (route) => {
    if (
      route.request().method() !== "GET" &&
      !new URL(route.request().url()).pathname.startsWith("/api/blog/")
    ) {
      result.realWrites.push(route.request().url());
      return route.abort();
    }
    await route.fallback();
  });
  const page = await ctx.newPage();
  page.on("pageerror", (error) => result.browserErrors.push(error.message));
  page.setDefaultTimeout(45000);
  return { ctx, page };
}
async function screenshot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  for (const image of await page.locator("main img").all()) {
    await image.scrollIntoViewIfNeeded();
    await check
      .poll(() => image.evaluate((img) => img.complete && img.naturalWidth > 0))
      .toBe(true);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(artifacts, name + ".png"),
    fullPage: true,
    caret: "initial",
  });
  result.screenshots.push(name);
}
async function noOverflow(page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Horizontal overflow: " + page.url(),
  );
}
(async () => {
  await fs.mkdir(artifacts, { recursive: true });
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    headless: true,
  });
  const { page, ctx } = await context();
  await page.goto(origin + "/blog", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await check(page.getByRole("heading", { level: 1 })).toHaveText(
    "مجله نوین رایانه",
  );
  await check(page.locator("[data-blog-card]")).toHaveCount(6);
  const articlePath = await page
    .locator("[data-blog-card] h3 a")
    .first()
    .getAttribute("href");
  await noOverflow(page);
  await screenshot(page, "archive-desktop");
  await page
    .getByRole("searchbox", { name: "جست‌وجو در مقاله‌ها" })
    .fill("عنوانی-که-وجود-ندارد-zzzzz");
  await page
    .getByRole("search", { name: "جست‌وجوی مقاله" })
    .getByRole("button", { name: "جست‌وجو", exact: true })
    .click();
  await check(
    page.getByRole("heading", { name: "مقاله‌ای پیدا نشد" }),
  ).toBeVisible();
  await page.goto(origin + "/blog?category=25", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await check(page.locator("[data-blog-card]")).toHaveCount(4);
  await check(
    page
      .getByRole("navigation", { name: "دسته‌بندی مقاله‌ها" })
      .locator('[aria-current="page"]'),
  ).toContainText("مقالات");
  await page.goto(origin + "/blog/category/" + encodeURIComponent("مقالات"), {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await check(page).toHaveURL(/\/blog\?category=25$/);
  result.checks.push(
    "real articles, category filter, legacy category redirect, search and empty state",
  );
  await page.goto(origin + articlePath, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await check(page.locator("article h1")).toContainText("آیفون");
  await check(
    page.getByRole("navigation", { name: "فهرست محتوای مقاله" }),
  ).toBeVisible();
  await check(
    page.locator("article > div").first().locator("img"),
  ).toBeVisible();
  await check(
    page.getByRole("heading", { name: "این مقاله‌ها را هم بخوانید" }),
  ).toBeVisible();
  await check(
    page.getByRole("button", { name: "ورود و ثبت دیدگاه" }),
  ).toBeEnabled();
  const ld = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((nodes) => nodes.map((node) => JSON.parse(node.textContent)));
  const article = ld.find((item) => item["@type"] === "BlogPosting");
  assert.ok(article.datePublished.startsWith("2025-"));
  assert.ok(article.mainEntityOfPage.includes("/blog/"));
  assert.equal(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    article.mainEntityOfPage,
  );
  await noOverflow(page);
  await screenshot(page, "article-desktop");
  await page.getByRole("button", { name: "ورود و ثبت دیدگاه" }).click();
  await check(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "بستن پنجره ورود" }).click();
  result.checks.push(
    "article HTML, headings/TOC, Gregorian SEO dates, login gate",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + "/blog", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await check(page.locator("[data-blog-card]")).toHaveCount(6);
  await noOverflow(page);
  await screenshot(page, "archive-mobile");
  await page.goto(origin + articlePath, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await check(page.locator("article h1")).toBeVisible();
  await check(
    page.getByRole("heading", { name: "این مقاله‌ها را هم بخوانید" }),
  ).toBeVisible();
  await check(
    page.getByRole("button", { name: "ورود و ثبت دیدگاه" }),
  ).toBeEnabled();
  await check(
    page.getByText("در حال دریافت دیدگاه‌ها…", { exact: true }),
  ).toHaveCount(0);
  await noOverflow(page);
  await screenshot(page, "article-mobile");
  const missing = await page.goto(origin + "/blog/no-such-post-7766554433", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  // Next returns 200 once a loading boundary has streamed; notFound still emits noindex.
  assert.ok([200, 404].includes(missing.status()));
  await check(
    page.getByRole("heading", { name: "مقاله یا صفحه موردنظر پیدا نشد" }),
  ).toBeVisible();
  await check
    .poll(() =>
      page
        .locator('meta[name="robots"]')
        .evaluateAll((nodes) =>
          nodes.some((node) => node.content.includes("noindex")),
        ),
    )
    .toBe(true);
  result.checks.push(
    "mobile archive/article, no horizontal overflow, missing post notFound/noindex",
  );
  await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 120000 });
  await check(page.locator("[data-home-blog] [data-blog-card]")).toHaveCount(6);
  await page.locator("[data-home-blog]").scrollIntoViewIfNeeded();
  await noOverflow(page);
  await page
    .locator("[data-home-blog]")
    .screenshot({
      path: path.join(artifacts, "home-carousel-mobile.png"),
      caret: "initial",
    });
  await page.setViewportSize({ width: 1440, height: 1100 });
  const next = page
    .locator("[data-home-blog]")
    .getByRole("button", { name: "مقاله‌های بعدی" });
  await check(next).toBeEnabled();
  await next.click();
  await check(
    page
      .locator("[data-home-blog]")
      .getByRole("button", { name: "مقاله‌های قبلی" }),
  ).toBeEnabled();
  await page.waitForTimeout(700);
  await page
    .locator("[data-home-blog]")
    .screenshot({
      path: path.join(artifacts, "home-carousel-desktop.png"),
      caret: "initial",
    });
  result.checks.push(
    "home carousel renders, mobile touch layout, desktop next/previous",
  );
  await ctx.close();

  const signedIn = await context(true, { width: 390, height: 844 });
  let writes = 0;
  await signedIn.ctx.route("**/api/blog/*/comments*", async (route) => {
    if (route.request().method() === "POST") {
      writes++;
      assert.ok(route.request().headers()["idempotency-key"]);
      await new Promise((resolve) => setTimeout(resolve, 400));
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          status: "pending",
          message: "دیدگاه شما ثبت شد و پس از تأیید مدیر نمایش داده می‌شود.",
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], page: 1, total: 0, totalPages: 0 }),
    });
  });
  await signedIn.page.goto(origin + articlePath, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  const field = signedIn.page.getByRole("textbox", {
    name: "شما چه فکر می‌کنید؟",
  });
  await field.fill("این یک دیدگاه شبیه‌سازی‌شده در مرورگر است.");
  await signedIn.page
    .getByRole("button", { name: "ثبت دیدگاه", exact: true })
    .click();
  await check(
    signedIn.page.getByText(
      "دیدگاه شما ثبت شد و پس از تأیید مدیر نمایش داده می‌شود.",
      { exact: true },
    ),
  ).toBeVisible();
  assert.equal(writes, 1);
  await check(field).toHaveValue("");
  await noOverflow(signedIn.page);
  await signedIn.page
    .locator("#blog-comments")
    .screenshot({
      path: path.join(artifacts, "comment-pending-mobile.png"),
      caret: "initial",
    });
  result.checks.push(
    "signed-in comment form, idempotency header, pending approval feedback (mocked write)",
  );
  await signedIn.ctx.close();
  assert.deepEqual(result.realWrites, []);
  assert.deepEqual(result.browserErrors, []);
  await fs.writeFile(
    path.join(artifacts, "results.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
})()
  .catch(async (error) => {
    result.error = error.stack;
    await fs.mkdir(artifacts, { recursive: true });
    await fs.writeFile(
      path.join(artifacts, "results.json"),
      JSON.stringify(result, null, 2),
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.race([
      browser?.close(),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
    process.exit(process.exitCode || 0);
  });
