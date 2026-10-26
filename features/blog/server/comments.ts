import "server-only";
import { z } from "zod";
import type { BlogCommentsPage } from "../schemas/blog.types";
import { blogText } from "./content";
import { isoDate } from "./mapper";
import { BlogApiError, blogRequest } from "./transport";

const commentSchema = z.object({
  id: z.number().int().positive(),
  post: z.number().int().positive(),
  parent: z.number().int().nonnegative(),
  author_name: z.string(),
  content: z.object({ rendered: z.string() }),
  date_gmt: z.string(),
  status: z.string(),
});

export async function getBlogComments(
  postId: number,
  page = 1,
): Promise<BlogCommentsPage> {
  const params = new URLSearchParams({
    post: String(postId),
    page: String(page),
    per_page: "6",
    order: "desc",
    context: "view",
    _fields: "id,post,parent,author_name,content,date_gmt,status",
  });
  const { data, headers } = await blogRequest(`/wp/v2/comments?${params}`, {
    private: true,
  });
  const parsed = z.array(commentSchema).safeParse(data);
  if (!parsed.success) throw new BlogApiError(502);
  const items = parsed.data
    .filter(
      (comment) => comment.post === postId && comment.status === "approved",
    )
    .map((comment) => ({
      id: comment.id,
      parent: comment.parent,
      author: blogText(comment.author_name),
      content: blogText(comment.content.rendered),
      publishedAt: isoDate(comment.date_gmt),
    }));
  const total = Number(headers.get("X-WP-Total") || items.length);
  const totalPages = Number(
    headers.get("X-WP-TotalPages") || (items.length ? 1 : 0),
  );
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    !Number.isSafeInteger(totalPages) ||
    totalPages < 0
  )
    throw new BlogApiError(502);
  return { items, total, totalPages, page };
}

export async function submitBlogComment(
  postId: number,
  content: string,
  auth: { userId: string; headers: Record<string, string> },
) {
  // Check the current public post instead of allowing comments on products, drafts or password-protected content.
  const { data: post } = await blogRequest(
    `/wp/v2/posts/${postId}?_fields=id,status,type,content,comment_status`,
    { private: true },
  );
  const gate = z
    .object({
      id: z.literal(postId),
      status: z.literal("publish"),
      type: z.literal("post"),
      content: z.object({ protected: z.literal(false) }),
      comment_status: z.literal("open"),
    })
    .safeParse(post);
  if (!gate.success) throw new BlogApiError(403, "comments_closed");
  const escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const { data } = await blogRequest("/wp/v2/comments", {
    private: true,
    method: "POST",
    headers: auth.headers,
    body: { post: postId, content: escaped, author: Number(auth.userId) },
  });
  const created = z
    .object({
      id: z.number().int().positive(),
      post: z.literal(postId),
      author: z.number().int(),
      status: z.enum(["approved", "hold", "unapproved"]),
    })
    .safeParse(data);
  if (!created.success || created.data.author !== Number(auth.userId))
    throw new BlogApiError(502);
  const approved = created.data.status === "approved";
  return {
    ok: true as const,
    status: approved ? ("approved" as const) : ("pending" as const),
    message: approved
      ? "دیدگاه شما منتشر شد. ممنون که تجربه‌تان را به اشتراک گذاشتید."
      : "دیدگاه شما ثبت شد و پس از تأیید مدیر نمایش داده می‌شود.",
  };
}
