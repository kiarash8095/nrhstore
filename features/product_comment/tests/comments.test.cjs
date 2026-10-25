/* eslint-disable @typescript-eslint/no-require-imports -- Standalone API test runner. */
const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const load = require("../../auth/tests/auth-test-loader.cjs");
const { NextRequest } = require("next/server");

process.env.WP_API_URL = "https://cms.example.test/wp-json";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
process.env.AUTH_SESSION_SECRET = "comments-test-session-secret-at-least-32-characters";

const { productReviewInputSchema } = load("features/product_comment/schemas/comments.types.ts");
const { GET } = load("app/api/product-comments/[productId]/route.ts");
const { POST } = load("app/api/product-review/route.ts");
const { authAdapter } = load("features/auth/server/backend/adapter.ts");
const { encodeJar } = load("features/auth/server/cookies.ts");
const authCookie = `nrh_auth=${encodeJar({ wordpress_logged_in_test: "logged-in", wp_rest: "test-nonce" })}`;
const originalFetch = global.fetch;
const originalGetSession = authAdapter.getSession;
beforeEach(() => {
  authAdapter.getSession = async () => ({ user: { id: "comments-test-user" }, jar: { wordpress_logged_in_test: "logged-in", wp_rest: "test-nonce" } });
});
afterEach(() => {
  global.fetch = originalFetch;
  authAdapter.getSession = originalGetSession;
});

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const validReview = { product_id: 1676, review: "کیفیت ساخت محصول خوب است و استفاده از آن برای من راحت بود.", reviewer: "علی رضایی", reviewer_email: "ali@example.com", rating: 5, pros: ["کیفیت ساخت"], cons: ["وزن زیاد"], criteria: {} };

test("review schema rejects empty, unsupported and URL-containing text", () => {
  assert.equal(productReviewInputSchema.safeParse({ ...validReview, review: "   " }).success, false);
  assert.equal(productReviewInputSchema.safeParse({ ...validReview, review: "This is a valid review but Русский text" }).success, false);
  assert.equal(productReviewInputSchema.safeParse({ ...validReview, review: "کیفیت عالی است https://example.com" }).success, false);
  assert.equal(productReviewInputSchema.safeParse({ ...validReview, rating: 0 }).success, false);
});

test("review schema returns Persian messages for missing and incorrectly typed values", () => {
  const missingRating = productReviewInputSchema.safeParse({ ...validReview, rating: 0 });
  assert.equal(missingRating.success, false);
  assert.equal(missingRating.error.issues[0].message, "لطفاً حداقل یک ستاره انتخاب کنید.");

  const wrongRatingType = productReviewInputSchema.safeParse({ ...validReview, rating: "5" });
  assert.equal(wrongRatingType.success, false);
  assert.equal(wrongRatingType.error.issues[0].message, "لطفاً امتیاز محصول را انتخاب کنید.");

  const wrongTextType = productReviewInputSchema.safeParse({ ...validReview, review: 42 });
  assert.equal(wrongTextType.success, false);
  assert.equal(wrongTextType.error.issues[0].message, "متن دیدگاه را وارد کنید.");

  const wrongNameType = productReviewInputSchema.safeParse({ ...validReview, reviewer: null });
  assert.equal(wrongNameType.success, false);
  assert.equal(wrongNameType.error.issues[0].message, "نام را وارد کنید.");

  const wrongTagsType = productReviewInputSchema.safeParse({ ...validReview, pros: "کیفیت" });
  assert.equal(wrongTagsType.success, false);
  assert.equal(wrongTagsType.error.issues[0].message, "نقاط قوت باید به‌صورت برچسب وارد شوند.");
});

test("comments route paginates approved comments by eight", async () => {
  global.fetch = async (url) => {
    assert.equal(String(url), "https://cms.example.test/wp-json/boom/v1/product-comments/1676/");
    return json(Array.from({ length: 10 }, (_, index) => ({ id: index + 1, reviewer: `کاربر ${index + 1}`, review: `دیدگاه ${index + 1}`, rating: 4, pros: ["کیفیت"] })));
  };
  const first = await GET(new NextRequest("http://localhost/api/product-comments/1676?page=1"), { params: Promise.resolve({ productId: "1676" }) });
  const firstBody = await first.json();
  assert.equal(first.status, 200);
  assert.equal(firstBody.comments.length, 8);
  assert.equal(firstBody.hasMore, true);
  const second = await GET(new NextRequest("http://localhost/api/product-comments/1676?page=2"), { params: Promise.resolve({ productId: "1676" }) });
  const secondBody = await second.json();
  assert.equal(secondBody.comments.length, 2);
  assert.equal(secondBody.hasMore, false);
});

test("review route validates before upstream and submits only to the trailing-slash endpoint", async () => {
  let calls = 0;
  global.fetch = async (url, options) => {
    calls += 1;
    assert.equal(String(url), "https://cms.example.test/wp-json/boom/v1/product-review/");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), validReview);
    return json({ success: true, message: "دیدگاه شما برای بررسی مدیر ثبت شد.", comment_id: 645 });
  };
  const invalid = await POST(new NextRequest("http://localhost/api/product-review", { method: "POST", headers: { "content-type": "application/json", cookie: authCookie }, body: JSON.stringify({ ...validReview, review: "" }) }));
  assert.equal(invalid.status, 400);
  assert.equal(calls, 0);
  const valid = await POST(new NextRequest("http://localhost/api/product-review", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie: authCookie }, body: JSON.stringify(validReview) }));
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { ok: true, status: "pending", message: "دیدگاه شما برای بررسی مدیر ثبت شد." });
  assert.equal(calls, 1);
});

test("review route maps upstream failure without leaking backend details", async () => {
  global.fetch = async () => json({ success: false, message: "private backend detail" }, 500);
  const response = await POST(new NextRequest("http://localhost/api/product-review", { method: "POST", headers: { "content-type": "application/json", cookie: authCookie }, body: JSON.stringify(validReview) }));
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /private backend detail/);
});

test("review route coalesces concurrent duplicate submissions and replays the result", async () => {
  let calls = 0;
  let releaseUpstream;
  const upstreamGate = new Promise(resolve => { releaseUpstream = resolve; });
  global.fetch = async (url, options) => {
    calls += 1;
    assert.equal(String(url), "https://cms.example.test/wp-json/boom/v1/product-review/");
    assert.equal(options.method, "POST");
    await upstreamGate;
    return json({ success: true, message: "دیدگاه برای بررسی مدیر ثبت شد.", comment_id: 700 });
  };

  const makeRequest = () => new NextRequest("http://localhost/api/product-review", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      cookie: authCookie,
      "idempotency-key": "review-idempotency-concurrent-700",
      "x-forwarded-for": "192.0.2.70",
    },
    body: JSON.stringify(validReview),
  });

  const first = POST(makeRequest());
  await new Promise(resolve => setTimeout(resolve, 10));
  const second = POST(makeRequest());
  await new Promise(resolve => setTimeout(resolve, 10));
  releaseUpstream();
  const [firstResponse, secondResponse] = await Promise.all([first, second]);

  assert.equal(calls, 1);
  assert.equal(firstResponse.status, 200);
  assert.equal(secondResponse.status, 200);
  assert.deepEqual(await firstResponse.json(), await secondResponse.json());
  assert.equal(secondResponse.headers.get("Idempotency-Replayed"), "true");

  const replay = await POST(makeRequest());
  assert.equal(replay.status, 200);
  assert.equal(replay.headers.get("Idempotency-Replayed"), "true");
  assert.equal(calls, 1);
});

test("review route rejects reusing an idempotency key for a different payload", async () => {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return json({ success: true, message: "ثبت شد.", comment_id: 701 });
  };
  const key = "review-idempotency-conflict-701";
  const request = (payload) => new NextRequest("http://localhost/api/product-review", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      cookie: authCookie,
      "idempotency-key": key,
      "x-forwarded-for": "192.0.2.71",
    },
    body: JSON.stringify(payload),
  });

  assert.equal((await POST(request(validReview))).status, 200);
  const conflict = await POST(request({ ...validReview, review: "این متن برای همان شناسه متفاوت است." }));
  assert.equal(conflict.status, 409);
  assert.equal(calls, 1);
  assert.match(await conflict.text(), /idempotency_conflict/);
});

test("review route rejects malformed idempotency keys before upstream", async () => {
  let calls = 0;
  global.fetch = async () => { calls += 1; return json({ success: true }); };
  const response = await POST(new NextRequest("http://localhost/api/product-review", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie: authCookie, "idempotency-key": "too-short" },
    body: JSON.stringify(validReview),
  }));
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test("review route rejects unauthenticated submissions before contacting WordPress", async () => {
  let calls = 0;
  authAdapter.getSession = async () => null;
  global.fetch = async () => { calls += 1; return json({ success: true, comment_id: 702 }); };
  const response = await POST(new NextRequest("http://localhost/api/product-review", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify(validReview),
  }));
  assert.equal(response.status, 401);
  assert.deepEqual((await response.json()).error.code, "login_required");
  assert.equal(calls, 0);
});
