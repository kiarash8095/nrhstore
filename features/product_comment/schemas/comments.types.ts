import { z } from "zod";

const supportedTextPattern = /^[A-Za-z\u0600-\u06FF0-9۰-۹٠-٩\s.,!?،؛؟:()\-_/٪%+\u200c\u200f"'«»…😀-🙏]+$/u;
const noMarkupOrUrl = (value: string) => !/[<>]|(?:https?:\/\/|www\.|(?:^|\s)@)/i.test(value);

export const commentTagSchema = z.string({ error: "برچسب معتبر نیست." })
  .trim()
  .min(1, "برچسب نمی‌تواند خالی باشد.")
  .max(40, "برچسب باید حداکثر ۴۰ کاراکتر باشد.")
  .refine(value => supportedTextPattern.test(value), "فقط حروف فارسی، انگلیسی و نشانه‌های مجاز را وارد کنید.")
  .refine(noMarkupOrUrl, "لینک و کد HTML مجاز نیست.");

const reviewerNameSchema = z.string({ error: "نام را وارد کنید." })
  .trim()
  .min(2, "نام را کامل وارد کنید.")
  .max(80, "نام باید حداکثر ۸۰ کاراکتر باشد.")
  .refine(value => /^[A-Za-z\u0600-\u06FF\s\u200c\u200f]+$/u.test(value), "نام فقط می‌تواند شامل حروف فارسی یا انگلیسی باشد.")
  .refine(noMarkupOrUrl, "لینک و کد HTML مجاز نیست.");

const reviewTextSchema = z.string({ error: "متن دیدگاه را وارد کنید." })
  .trim()
  .min(10, "متن دیدگاه باید حداقل ۱۰ کاراکتر باشد.")
  .max(2000, "متن دیدگاه باید حداکثر ۲۰۰۰ کاراکتر باشد.")
  .refine(value => supportedTextPattern.test(value), "فقط فارسی، انگلیسی و نشانه‌های مجاز پشتیبانی می‌شود.")
  .refine(noMarkupOrUrl, "لینک، کد HTML و منشن مجاز نیست.")
  .refine(value => !/(.)\1{11,}/u.test(value), "متن واردشده معتبر نیست.");

export const productReviewInputSchema = z.strictObject({
  product_id: z.number({ error: "شناسهٔ محصول معتبر نیست." })
    .int("شناسهٔ محصول باید عدد صحیح باشد.")
    .positive("شناسهٔ محصول معتبر نیست.")
    .max(10_000_000, "شناسهٔ محصول معتبر نیست."),
  review: reviewTextSchema,
  reviewer: reviewerNameSchema,
  reviewer_email: z.string({ error: "ایمیل معتبر نیست." }).trim().email("ایمیل معتبر نیست.").max(254, "ایمیل باید حداکثر ۲۵۴ کاراکتر باشد.").optional(),
  rating: z.number({ error: "لطفاً امتیاز محصول را انتخاب کنید." })
    .int("امتیاز باید یک عدد صحیح بین ۱ تا ۵ باشد.")
    .min(1, "لطفاً حداقل یک ستاره انتخاب کنید.")
    .max(5, "امتیاز باید بین ۱ تا ۵ باشد."),
  pros: z.array(commentTagSchema, { error: "نقاط قوت باید به‌صورت برچسب وارد شوند." }).max(8, "حداکثر ۸ نقطه قوت اضافه کنید."),
  cons: z.array(commentTagSchema, { error: "نقاط ضعف باید به‌صورت برچسب وارد شوند." }).max(8, "حداکثر ۸ نقطه ضعف اضافه کنید."),
  criteria: z.record(
    z.string({ error: "نام معیار معتبر نیست." }),
    z.union([
      z.string({ error: "مقدار معیار معتبر نیست." }),
      z.number({ error: "مقدار معیار معتبر نیست." }),
      z.boolean({ error: "مقدار معیار معتبر نیست." }),
    ], { error: "مقدار معیار معتبر نیست." }),
    { error: "معیارهای دیدگاه معتبر نیستند." },
  ).default({}),
}, { error: "اطلاعات فرم دیدگاه معتبر نیست." });

export type ProductReviewInput = z.infer<typeof productReviewInputSchema>;

export interface ProductComment {
  id: string;
  reviewer: string;
  review: string;
  rating: number;
  pros: string[];
  cons: string[];
  date: string | null;
}

export interface ProductCommentsPage {
  comments: ProductComment[];
  page: number;
  perPage: number;
  hasMore: boolean;
  total: number;
}

export const reviewFieldLabels: Record<string, string> = {
  product_id: "محصول",
  review: "دیدگاه",
  reviewer: "نام",
  reviewer_email: "ایمیل",
  rating: "امتیاز",
  pros: "نقاط قوت",
  cons: "نقاط ضعف",
};
