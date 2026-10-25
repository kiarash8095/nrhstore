import "server-only";

import { boundedJson } from "@/lib/http/bounded-json";
import { getWordPressApiUrl } from "@/lib/wordpress/config";
import type { ProductComment, ProductReviewInput } from "../schemas/comments.types";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_COMMENTS_RESPONSE_BYTES = 512 * 1024;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim() : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(item => asText(item)).filter(Boolean).slice(0, 8);
}

function pick(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) if (record[key] !== undefined && record[key] !== null) return record[key];
  return undefined;
}

function normalizeComment(value: unknown, index: number): ProductComment | null {
  const record = asRecord(value);
  if (!record) return null;
  const review = asText(pick(record, ["review", "comment", "content", "text", "comment_content"]));
  const reviewer = asText(pick(record, ["reviewer", "reviewer_name", "author", "author_name", "name"]), "کاربر فروشگاه");
  if (!review) return null;
  const rawRating = Math.round(asNumber(pick(record, ["rating", "score", "stars"]), 0));
  const rating = rawRating >= 1 && rawRating <= 5 ? rawRating : 0;
  const rawId = pick(record, ["id", "comment_id", "review_id"]);
  const date = asText(pick(record, ["date", "created_at", "created", "review_date"]));
  return {
    id: asText(rawId, `comment-${index}`),
    reviewer,
    review,
    rating,
    pros: asStringArray(pick(record, ["pros", "strengths", "advantages"])),
    cons: asStringArray(pick(record, ["cons", "weaknesses", "disadvantages"])),
    date: date || null,
  };
}

function extractCommentArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (!record) return [];
  for (const key of ["comments", "data", "items", "results", "reviews"]) {
    if (Array.isArray(record[key])) return record[key];
    const nested = extractCommentArray(record[key]);
    if (nested.length) return nested;
  }
  return [];
}

export function normalizeComments(value: unknown): ProductComment[] {
  return extractCommentArray(value)
    .map(normalizeComment)
    .filter((comment): comment is ProductComment => Boolean(comment))
    .sort((left, right) => {
      const leftTime = left.date ? Date.parse(left.date) : Number.NEGATIVE_INFINITY;
      const rightTime = right.date ? Date.parse(right.date) : Number.NEGATIVE_INFINITY;
      if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return 0;
      return rightTime - leftTime;
    });
}

async function boomFetch(path: string, options: RequestInit = {}) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch(`${getWordPressApiUrl()}${path}`, {
    ...options,
    headers: { Accept: "application/json", ...options.headers },
    cache: "no-store",
    redirect: "error",
    signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
  });
  const data = await boundedJson(response, MAX_COMMENTS_RESPONSE_BYTES);
  return { response, data };
}

export async function getProductComments(productId: number) {
  const { response, data } = await boomFetch(`/boom/v1/product-comments/${productId}/`);
  if (!response.ok) throw new Error("Product comments backend failed.");
  return normalizeComments(data);
}

export async function submitProductReview(payload: ProductReviewInput) {
  const { response, data } = await boomFetch("/boom/v1/product-review/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  if (!response.ok || record?.success !== true) throw new Error("Product review backend rejected the request.");
  return {
    commentId: asText(record.comment_id),
    message: asText(record.message, "دیدگاه شما برای بررسی مدیر ثبت شد."),
  };
}
