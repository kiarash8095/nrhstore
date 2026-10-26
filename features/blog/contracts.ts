import { z } from "zod";

export const blogCommentInputSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(3, "دیدگاه باید حداقل ۳ نویسه داشته باشد.")
      .max(3000, "دیدگاه نباید بیش از ۳۰۰۰ نویسه باشد.")
      .refine(
        (value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),
        "متن دیدگاه معتبر نیست.",
      ),
  })
  .strict();
export const blogCommentSchema = z.object({
  id: z.number().int().positive(),
  parent: z.number().int().nonnegative(),
  author: z.string(),
  content: z.string(),
  publishedAt: z.string(),
});
export const blogCommentsPageSchema = z.object({
  items: z.array(blogCommentSchema),
  page: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export const blogCommentResultSchema = z.object({
  ok: z.literal(true),
  status: z.enum(["approved", "pending"]),
  message: z.string(),
});
