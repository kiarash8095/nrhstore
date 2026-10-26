/* eslint-disable @typescript-eslint/no-require-imports -- Isolated WordPress/BFF security tests. */
const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const load = require("../../auth/tests/auth-test-loader.cjs");
const { NextRequest } = require("next/server");
process.env.WP_API_URL = "https://cms.example.test/wp-json";
process.env.AUTH_SESSION_SECRET = crypto.randomBytes(32).toString("hex");
const service = load("features/blog/api/blog.service.ts");
const content = load("features/blog/server/content.ts");
const utils = load("features/blog/utils/blog.ts");
const auth = load("features/auth/server/backend/adapter.ts").authAdapter;
const cookies = load("features/auth/server/cookies.ts");
const routes = load("features/blog/server/comment-handlers.ts");
const { clearAllRateLimits } = load("lib/server/rate-limit.ts");
const oldFetch = global.fetch,
  oldSession = auth.getSession;
after(() => {
  global.fetch = oldFetch;
  auth.getSession = oldSession;
});
const wp = () => ({
  id: 588,
  slug: "%d8%ae%d8%a8%d8%b1",
  type: "post",
  status: "publish",
  title: { rendered: "عنوان &amp; تست" },
  excerpt: { rendered: "<p>خلاصه مقاله</p>", protected: false },
  content: { rendered: "<h2>بخش اول</h2><p>بدنه مقاله</p>", protected: false },
  date_gmt: "2025-12-19T23:08:39",
  modified_gmt: "2025-12-19T23:08:39",
  categories: [22],
  comment_status: "open",
  _embedded: {
    author: [
      {
        id: 103,
        name: "نویسنده",
        email: "private@example.test",
        woocommerce_meta: "private",
      },
    ],
    "wp:featuredmedia": [
      {
        source_url: "https://cms.example.test/wp-content/uploads/a.webp",
        media_details: { width: 1200, height: 800 },
      },
    ],
    "wp:term": [[{ id: 22, name: "خبر", slug: "news", taxonomy: "category" }]],
  },
});
const boom = () => ({
  ...wp(),
  date: "1404-09-29T02:38:39+03:30",
  author: { id: "103", name: "نویسنده" },
  featured_media: {
    source_url: "https://cms.example.test/wp-content/uploads/a.webp",
  },
  categories: [{ id: 22, name: "خبر", slug: "news" }],
  tags: [],
  related_posts: [{ id: 579 }],
  meta: { private: "do-not-leak" },
});
let calls, scenario;
beforeEach(() => {
  calls = [];
  scenario = "ok";
  clearAllRateLimits();
  auth.getSession = async () => ({
    user: { id: "7" },
    jar: { wordpress_logged_in_fixture: "valid", wp_rest: "1234567890" },
  });
  global.fetch = async (url, options = {}) => {
    const u = new URL(String(url));
    calls.push({ url: u, options });
    if (u.pathname.endsWith("/boom/v1/blog/categories"))
      return Response.json([
        { id: 22, name: "خبر", slug: "news", count: 2 },
        { id: 1, name: "خالی", slug: "empty", count: 0 },
      ]);
    if (u.pathname.includes("/boom/v1/blog/post/"))
      return Response.json({
        ...boom(),
        ...(scenario === "wrong-id" ? { id: 99 } : {}),
      });
    if (u.pathname.endsWith("/wp/v2/posts"))
      return Response.json(
        scenario === "missing"
          ? []
          : [
              {
                ...wp(),
                ...(scenario === "protected"
                  ? { content: { rendered: "private body", protected: true } }
                  : {}),
              },
            ],
        { headers: { "X-WP-Total": "1", "X-WP-TotalPages": "1" } },
      );
    if (u.pathname.endsWith("/wp/v2/posts/588"))
      return Response.json({
        id: 588,
        status: scenario === "draft" ? "draft" : "publish",
        type: scenario === "product" ? "product" : "post",
        content: { protected: false },
        comment_status: scenario === "closed" ? "closed" : "open",
      });
    if (u.pathname.endsWith("/wp/v2/comments") && options.method === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 20));
      if (scenario === "timeout") throw new Error("timeout");
      return Response.json(
        {
          id: 55,
          post: 588,
          author: 7,
          status: scenario === "approved" ? "approved" : "hold",
          author_email: "private@example.test",
        },
        { status: 201 },
      );
    }
    if (u.pathname.endsWith("/wp/v2/comments"))
      return Response.json([
        {
          id: 1,
          post: 588,
          parent: 0,
          author_name: "کاربر",
          content: { rendered: "<p>متن <script>secret()</script>عمومی</p>" },
          date_gmt: "2025-12-19T23:08:39",
          status: "approved",
          author_email: "hidden@example.test",
        },
        {
          id: 2,
          post: 588,
          parent: 0,
          author_name: "محرمانه",
          content: { rendered: "pending-secret" },
          date_gmt: "2025-12-19T23:08:39",
          status: "hold",
        },
      ]);
    throw new Error("Unexpected URL: " + u);
  };
});
function request(
  body = { content: "نظر آزمایشی درباره مقاله" },
  headers = {},
  key = crypto.randomUUID(),
) {
  return new NextRequest("http://localhost:3000/api/blog/588/comments", {
    method: "POST",
    headers: {
      Origin: "http://localhost:3000",
      "Content-Type": "application/json",
      "Idempotency-Key": key,
      Cookie:
        "nrh_auth=" +
        cookies.encodeJar({ wordpress_logged_in_fixture: "valid" }),
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
const ctx = () => ({ params: Promise.resolve({ postId: "588" }) });

test("normalizes Persian slugs once, validates paths and retains search/category during pagination", () => {
  assert.equal(
    utils.blogPostPath("%d8%ae%d8%a8%d8%b1"),
    "/blog/%D8%AE%D8%A8%D8%B1",
  );
  for (const slug of ["../private", "%2fadmin", "%252fadmin", "a?b", ".."])
    assert.equal(utils.validBlogSlug(slug), false);
  assert.equal(
    utils.blogListPath({ category: 22, search: "laptop", page: 2 }),
    "/blog?category=22&q=laptop&page=2",
  );
});
test("HTML sanitization retains rich content and removes scripts, theme styles, event handlers, dangerous URLs and embeds", () => {
  const result = content.prepareBlogContent(
    '<h1>تیتر</h1><p style="position:fixed" onclick="attack()">متن &amp; عدد &#1777;</p><script>alert(1)</script><style>body{display:none}</style><img src="javascript:alert(1)" onerror="attack()"><a href="javascript:evil()">لینک</a><iframe src="https://evil.test"></iframe><table><tr><td>سلول</td></tr></table><img src="https://cms.example.test/wp-content/uploads/a.webp" alt="عکس">',
  );
  assert.doesNotMatch(
    result.html,
    /onclick|onerror|javascript:|<script|<style|<iframe|position:fixed/,
  );
  assert.match(result.html, /article-section-1/);
  assert.match(result.html, /<table>/);
  assert.match(result.html, /loading="lazy"/);
  assert.deepEqual(result.headings, [
    { id: "article-section-1", text: "تیتر", level: 2 },
  ]);
  assert.equal(content.blogText("<p>&#1777; &amp; تست</p>"), "۱ & تست");
  const anchors = content.prepareBlogContent(
    '<a href="#old">بخش اول</a><h3 id="old" dir="rtl">تیتر</h3>',
  );
  assert.match(anchors.html, /href="#article-section-1"/);
  assert.match(anchors.html, /<h3 dir="rtl" id="article-section-1">/);
  assert.doesNotMatch(anchors.html, /target="_blank"/);
});
test("list requests use server-only public fetch, bounded fields and safe DTOs", async () => {
  const list = await service.getBlogCollection({
    page: 2,
    perPage: 3,
    category: 22,
    search: "آیفون",
  });
  assert.equal(list.items[0].author.name, "نویسنده");
  assert.equal(list.items[0].title, "عنوان & تست");
  assert.equal(calls[0].url.searchParams.get("categories"), "22");
  assert.equal(calls[0].url.searchParams.get("search"), "آیفون");
  assert.equal(calls[0].options.next.revalidate, 300);
  assert.equal(calls[0].options.headers.Cookie, undefined);
  assert.doesNotMatch(
    JSON.stringify(list),
    /private@example|woocommerce_meta|do-not-leak|contentHtml/,
  );
});
test("Gregorian core dates remain authoritative even when Boom returns Jalali dates", async () => {
  const post = await service.getBlogPost("خبر");
  assert.equal(post.publishedAt, "2025-12-19T23:08:39.000Z");
  assert.match(utils.formatBlogDate(post.publishedAt), /۱۴۰۴/);
  assert.deepEqual(post.relatedIds, [579]);
  assert.doesNotMatch(JSON.stringify(post), /do-not-leak/);
});
test("sitemap reads a lightweight projection with no embeds and excludes protected posts", async () => {
  const posts = await service.getAllBlogPosts();
  assert.equal(posts.length, 1);
  assert.deepEqual(Object.keys(posts[0]).sort(), ["modifiedAt", "slug"]);
  assert.equal(calls[0].url.searchParams.has("_embed"), false);
  assert.match(calls[0].url.searchParams.get("_fields"), /content.protected/);
  scenario = "protected";
  assert.deepEqual(await service.getAllBlogPosts(), []);
});
test("protected and missing posts never render and mismatched Boom identity is rejected", async () => {
  scenario = "protected";
  assert.equal(await service.getBlogPost("خبر"), null);
  scenario = "missing";
  assert.equal(await service.getBlogPost("خبر"), null);
  scenario = "wrong-id";
  await assert.rejects(service.getBlogPost("خبر"));
});
test("only approved public comments and minimal author data are returned", async () => {
  const response = await routes.GET(
    new NextRequest("http://localhost:3000/api/blog/588/comments"),
    ctx(),
  );
  const data = await response.json();
  assert.equal(data.items.length, 1);
  assert.doesNotMatch(
    JSON.stringify(data),
    /pending-secret|hidden@example|secret\(\)/,
  );
  assert.match(response.headers.get("cache-control"), /no-store/);
});
test("cross-origin and injected author/status fields fail before WordPress writes", async () => {
  assert.equal(
    (
      await routes.POST(
        request(undefined, { Origin: "https://evil.test" }),
        ctx(),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await routes.POST(
        request({ content: "متن تست", author: 1, status: "approved" }),
        ctx(),
      )
    ).status,
    400,
  );
  assert.equal(calls.length, 0);
});
test("guests cannot write and server-verified identity supplies WordPress cookies/nonce", async () => {
  auth.getSession = async () => null;
  assert.equal((await routes.POST(request(), ctx())).status, 401);
  assert.equal(calls.length, 0);
  auth.getSession = async () => ({
    user: { id: "7" },
    jar: { wordpress_logged_in_fixture: "valid", wp_rest: "1234567890" },
  });
  const response = await routes.POST(
    request({ content: "<script>مثال امن</script>" }),
    ctx(),
  );
  assert.equal(response.status, 201);
  assert.equal((await response.json()).status, "pending");
  const call = calls.find((call) => call.options.method === "POST");
  assert.equal(call.options.headers["X-WP-Nonce"], "1234567890");
  assert.match(
    call.options.headers.Cookie,
    /wordpress_logged_in_fixture=valid/,
  );
  assert.deepEqual(JSON.parse(call.options.body), {
    post: 588,
    author: 7,
    content: "&lt;script&gt;مثال امن&lt;/script&gt;",
  });
});
test("closed, draft or non-blog posts cannot receive comments", async () => {
  for (const mode of ["closed", "draft", "product"]) {
    scenario = mode;
    calls = [];
    assert.equal((await routes.POST(request(), ctx())).status, 403);
    assert.equal(
      calls.filter((call) => call.options.method === "POST").length,
      0,
    );
  }
});
test("account rate limit also applies to different content and idempotency keys", async () => {
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await routes.POST(request({ content: "دیدگاه شماره " + i }), ctx()))
        .status,
      201,
    );
  const response = await routes.POST(request({ content: "دیدگاه ششم" }), ctx());
  assert.equal(response.status, 429);
  assert.ok(response.headers.get("retry-after"));
  assert.equal(
    calls.filter((call) => call.options.method === "POST").length,
    5,
  );
});
test("concurrent replay is one upstream write, altered payload conflicts, and timeout is never retried automatically", async () => {
  const key = crypto.randomUUID();
  const responses = await Promise.all([
    routes.POST(request(undefined, {}, key), ctx()),
    routes.POST(request(undefined, {}, key), ctx()),
  ]);
  assert.ok(responses.every((response) => response.status === 201));
  assert.equal(
    calls.filter((call) => call.options.method === "POST").length,
    1,
  );
  assert.equal(
    (await routes.POST(request({ content: "متن متفاوت" }, {}, key), ctx()))
      .status,
    409,
  );
  calls = [];
  scenario = "timeout";
  const timeoutKey = crypto.randomUUID();
  assert.equal(
    (await routes.POST(request(undefined, {}, timeoutKey), ctx())).status,
    502,
  );
  assert.equal(
    (await routes.POST(request(undefined, {}, timeoutKey), ctx())).status,
    502,
  );
  assert.equal(
    calls.filter((call) => call.options.method === "POST").length,
    1,
  );
});
