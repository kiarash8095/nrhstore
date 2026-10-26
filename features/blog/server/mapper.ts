import "server-only";
import { z } from "zod";
import { blogText, safeImageUrl } from "./content";
import { readingTime } from "../utils/blog";
import type { BlogCategory, BlogPostSummary } from "../schemas/blog.types";

export const renderedSchema = z.object({
  rendered: z.string(),
  protected: z.boolean().optional(),
});
export const termSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  taxonomy: z.string().optional(),
  count: z.number().optional(),
});
export const mediaSchema = z.object({
  source_url: z.string(),
  alt_text: z.string().optional(),
  media_details: z
    .object({ width: z.number().optional(), height: z.number().optional() })
    .optional(),
});
export const authorSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string(),
});
export const wpPostSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().min(1),
  status: z.string(),
  type: z.string(),
  date_gmt: z.string(),
  modified_gmt: z.string(),
  title: renderedSchema,
  excerpt: renderedSchema,
  content: renderedSchema,
  comment_status: z.string(),
  categories: z.array(z.number()),
  _embedded: z
    .object({
      author: z.array(z.unknown()).optional(),
      "wp:featuredmedia": z.array(z.unknown()).optional(),
      "wp:term": z.array(z.array(z.unknown())).optional(),
    })
    .optional(),
});

export function isoDate(value: string) {
  // Core WP dates are Gregorian. Boom's 14xx date fields must not enter Date().
  if (!/^(?:19|20|21)\d{2}-\d{2}-\d{2}T/.test(value))
    throw new Error("Invalid WordPress date");
  const date = new Date(
    /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + "Z",
  );
  if (!Number.isFinite(date.getTime()))
    throw new Error("Invalid WordPress date");
  return date.toISOString();
}

export function categoryDto(value: z.infer<typeof termSchema>): BlogCategory {
  return {
    id: value.id,
    name: blogText(value.name),
    slug: value.slug,
    count: value.count || 0,
  };
}

export function summaryDto(
  post: z.infer<typeof wpPostSchema>,
): BlogPostSummary {
  const author = authorSchema.safeParse(post._embedded?.author?.[0]);
  const media = mediaSchema.safeParse(
    post._embedded?.["wp:featuredmedia"]?.[0],
  );
  const src = media.success ? safeImageUrl(media.data.source_url) : null;
  const terms =
    post._embedded?.["wp:term"]
      ?.flat()
      .map((term) => termSchema.safeParse(term))
      .filter((result) => result.success && result.data.taxonomy === "category")
      .map((result) => categoryDto(result.data!)) || [];
  return {
    id: post.id,
    slug: post.slug,
    title: blogText(post.title.rendered),
    excerpt: blogText(post.excerpt.rendered || post.content.rendered).slice(
      0,
      230,
    ),
    publishedAt: isoDate(post.date_gmt),
    modifiedAt: isoDate(post.modified_gmt),
    author: author.success
      ? { id: author.data.id, name: blogText(author.data.name) }
      : null,
    categories: terms,
    image:
      src && media.success
        ? {
            src,
            alt: blogText(media.data.alt_text || post.title.rendered),
            width: media.data.media_details?.width || 1200,
            height: media.data.media_details?.height || 800,
          }
        : null,
    readingMinutes: readingTime(blogText(post.content.rendered)),
  };
}
