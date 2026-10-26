import "server-only";
import { cache } from "react";
import { z } from "zod";
import type { BlogCollection, BlogPost } from "../schemas/blog.types";
import { validBlogSlug } from "../utils/blog";
import { decodeSlug } from "@/lib/urls";
import { BlogApiError, blogRequest } from "../server/transport";
import {
  authorSchema,
  categoryDto,
  isoDate,
  mediaSchema,
  renderedSchema,
  summaryDto,
  termSchema,
  wpPostSchema,
} from "../server/mapper";
import { blogText, prepareBlogContent, safeImageUrl } from "../server/content";

const FIELDS =
  "id,slug,status,type,date_gmt,modified_gmt,title,content,excerpt,comment_status,categories,_links,_embedded";
const boomPostSchema = z.object({
  id: z.number().int().positive(),
  status: z.string(),
  type: z.string(),
  slug: z.string(),
  title: renderedSchema,
  content: renderedSchema,
  author: authorSchema.nullish(),
  featured_media: z.unknown().optional(),
  categories: z.array(termSchema),
  tags: z.array(termSchema),
  related_posts: z
    .array(z.object({ id: z.number().int().positive() }))
    .optional(),
});

function publicPost(post: z.infer<typeof wpPostSchema>) {
  return (
    post.status === "publish" &&
    post.type === "post" &&
    !post.content.protected &&
    !post.excerpt.protected &&
    validBlogSlug(post.slug)
  );
}

export async function getBlogCollection({
  page = 1,
  perPage = 9,
  category,
  search = "",
  include,
}: {
  page?: number;
  perPage?: number;
  category?: number;
  search?: string;
  include?: number[];
} = {}): Promise<BlogCollection> {
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !Number.isSafeInteger(perPage) ||
    perPage < 1 ||
    perPage > 100 ||
    (category !== undefined &&
      (!Number.isSafeInteger(category) || category < 1)) ||
    search.length > 100
  )
    throw new BlogApiError(400, "invalid_input");
  const query = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    status: "publish",
    order: "desc",
    orderby: include ? "include" : "date",
    _embed: "author,wp:featuredmedia,wp:term",
    _fields: FIELDS,
  });
  if (category) query.set("categories", String(category));
  if (search) query.set("search", search);
  if (include) query.set("include", include.join(","));
  try {
    const { data, headers } = await blogRequest(`/wp/v2/posts?${query}`);
    const posts = z.array(wpPostSchema).parse(data);
    const total = Number(headers.get("X-WP-Total") || posts.length);
    const totalPages = Number(
      headers.get("X-WP-TotalPages") || (posts.length ? 1 : 0),
    );
    if (
      !Number.isSafeInteger(total) ||
      total < 0 ||
      !Number.isSafeInteger(totalPages) ||
      totalPages < 0
    )
      throw new BlogApiError(502);
    return {
      items: posts.filter(publicPost).map(summaryDto),
      total,
      totalPages,
      page,
    };
  } catch (error) {
    if (error instanceof BlogApiError) throw error;
    throw new BlogApiError(502, "invalid_response");
  }
}

export const getBlogCategories = cache(async () => {
  const { data } = await blogRequest("/boom/v1/blog/categories");
  const parsed = z
    .array(termSchema.extend({ count: z.number().int().nonnegative() }))
    .safeParse(data);
  if (!parsed.success) throw new BlogApiError(502, "invalid_response");
  return parsed.data.filter((category) => category.count > 0).map(categoryDto);
});

export const getBlogPost = cache(
  async (slug: string): Promise<BlogPost | null> => {
    if (!validBlogSlug(slug)) return null;
    const normalized = decodeSlug(slug);
    const query = new URLSearchParams({
      slug: normalized,
      status: "publish",
      _embed: "author,wp:featuredmedia,wp:term",
      _fields: FIELDS,
    });
    // Core status/protection and Gregorian dates remain authoritative. Never trust Boom meta or date fields.
    const { data } = await blogRequest(`/wp/v2/posts?${query}`);
    const core = z.array(wpPostSchema).safeParse(data);
    if (!core.success) throw new BlogApiError(502, "invalid_response");
    const wp = core.data.find(
      (post) => decodeSlug(post.slug) === normalized && publicPost(post),
    );
    if (!wp) return null;
    let detail: unknown;
    try {
      detail = (
        await blogRequest(
          `/boom/v1/blog/post/${encodeURIComponent(normalized)}`,
        )
      ).data;
    } catch (error) {
      if (!(error instanceof BlogApiError && error.status === 404)) throw error;
    }
    const parsed = boomPostSchema.safeParse(detail);
    if (
      detail !== undefined &&
      (!parsed.success ||
        parsed.data.id !== wp.id ||
        decodeSlug(parsed.data.slug) !== normalized ||
        parsed.data.status !== "publish" ||
        parsed.data.type !== "post" ||
        parsed.data.content.protected)
    )
      throw new BlogApiError(502, "invalid_response");
    const boom = parsed.success ? parsed.data : null;
    const base = summaryDto(wp);
    const content = prepareBlogContent(
      boom?.content.rendered || wp.content.rendered,
    );
    const media = mediaSchema.safeParse(boom?.featured_media);
    const src = media.success ? safeImageUrl(media.data.source_url) : null;
    return {
      ...base,
      author: boom?.author
        ? { id: boom.author.id, name: blogText(boom.author.name) }
        : base.author,
      categories: boom ? boom.categories.map(categoryDto) : base.categories,
      image:
        base.image ||
        (src && media.success
          ? {
              src,
              alt: base.title,
              width: media.data.media_details?.width || 1200,
              height: media.data.media_details?.height || 800,
            }
          : null),
      contentHtml: content.html,
      headings: content.headings,
      tags:
        boom?.tags.map((tag) => ({
          id: tag.id,
          name: blogText(tag.name),
          slug: tag.slug,
        })) || [],
      commentsOpen: wp.comment_status === "open",
      relatedIds: [
        ...new Set(boom?.related_posts?.map((post) => post.id) || []),
      ]
        .filter((id) => id !== wp.id)
        .slice(0, 3),
    };
  },
);

export async function getRelatedBlogPosts(post: BlogPost) {
  if (!post.relatedIds.length) return [];
  return (await getBlogCollection({ include: post.relatedIds, perPage: 3 }))
    .items;
}

export async function getAllBlogPosts() {
  // The sitemap needs no article HTML, images, authors, or embedded taxonomy data.
  const schema = z.array(
    z.object({
      slug: z.string(),
      status: z.string(),
      type: z.string(),
      modified_gmt: z.string(),
      content: z.object({ protected: z.boolean() }),
      excerpt: z.object({ protected: z.boolean() }),
    }),
  );
  const items: { slug: string; modifiedAt: string }[] = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page++) {
    const query = new URLSearchParams({
      page: String(page),
      per_page: "100",
      status: "publish",
      _fields:
        "slug,status,type,modified_gmt,content.protected,excerpt.protected",
    });
    const { data, headers } = await blogRequest(`/wp/v2/posts?${query}`);
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw new BlogApiError(502, "invalid_response");
    totalPages = Number(headers.get("X-WP-TotalPages") || 1);
    if (!Number.isSafeInteger(totalPages) || totalPages < 0)
      throw new BlogApiError(502);
    items.push(
      ...parsed.data
        .filter(
          (post) =>
            post.status === "publish" &&
            post.type === "post" &&
            !post.content.protected &&
            !post.excerpt.protected &&
            validBlogSlug(post.slug),
        )
        .map((post) => ({
          slug: post.slug,
          modifiedAt: isoDate(post.modified_gmt),
        })),
    );
  }
  return items;
}
