import { z } from "zod";

export const bannerGroups = ["slider", "featured", "connection", "hardware", "gaming", "printer"] as const;
export type BannerGroup = (typeof bannerGroups)[number];

export const bannerGroupLabels: Record<BannerGroup, string> = {
  slider: "اسلایدر اصلی",
  featured: "ردیف بنرهای ویژه",
  connection: "بنر اتصال پایدار",
  hardware: "بنرهای تجهیزات",
  gaming: "بنر کیس گیمینگ",
  printer: "بنر پرینتر",
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_BANNERS = 40;

// Only serve bundled images and our own validated uploads. Remote URLs and SVG
// are intentionally excluded from editable banner sources.
const bundledSources = new Set([
  "/Untitled-1-2.webp", "/Untitled-11.webp", "/slider1-5.webp", "/slider4.webp",
  "/11-1.webp", "/22-1.webp", "/33-1.webp", "/Untitled-111.webp",
  "/Layer-2.webp", "/Layer-2-1.webp", "/کیس-گیمینگ-همدان.webp", "/خرید_پرینتر_همدان.webp",
]);

export const uploadFilenamePattern = /^[a-f0-9-]{36}\.webp$/;

export const bannerSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  group: z.enum(bannerGroups),
  title: z.string().trim().min(1, "عنوان بنر را وارد کنید.").max(160),
  src: z.string().refine((src) => bundledSources.has(src) ||
    (src.startsWith("/api/banner-images/") && uploadFilenamePattern.test(src.slice("/api/banner-images/".length))),
  "تصویر بنر معتبر نیست."),
  width: z.number().int().min(1).max(10000),
  height: z.number().int().min(1).max(10000),
}).strict();

export const bannerListSchema = z.array(bannerSchema).max(MAX_BANNERS)
  .refine((banners) => new Set(banners.map((banner) => banner.id)).size === banners.length,
    "شناسه بنرها باید یکتا باشد.");

export const bannerDocumentSchema = z.object({
  revision: z.string().min(1).max(80),
  banners: bannerListSchema,
}).strict();

export type SiteBanner = z.infer<typeof bannerSchema>;
export type BannerDocument = z.infer<typeof bannerDocumentSchema>;
