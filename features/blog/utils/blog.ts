import { decodeSlug } from "@/lib/urls";

export function validBlogSlug(value: string) {
  const slug = decodeSlug(value);
  return (
    slug.length > 0 &&
    slug.length <= 240 &&
    !/[\/\\?#%\u0000-\u0020\u007f]/.test(slug) &&
    slug !== "." &&
    slug !== ".."
  );
}

export function blogPostPath(slug: string) {
  return `/blog/${encodeURIComponent(decodeSlug(slug))}`;
}

export function blogListPath({
  page = 1,
  category,
  search,
}: { page?: number; category?: number; search?: string } = {}) {
  const params = new URLSearchParams();
  if (category) params.set("category", String(category));
  if (search) params.set("q", search);
  if (page > 1) params.set("page", String(page));
  return `/blog${params.size ? `?${params}` : ""}`;
}

export function formatBlogDate(value: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return "تاریخ ثبت نشده";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "long",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

export function readingTime(text: string) {
  return Math.max(
    1,
    Math.ceil(text.trim().split(/\s+/u).filter(Boolean).length / 200),
  );
}
