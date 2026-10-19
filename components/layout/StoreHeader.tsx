import { getAllCategories } from "@/features/categories/server";
import { decodeSlug } from '@/lib/urls';
import Header from "./SiteHeader";

const HEADER_CATEGORY_SLUGS = [
  "laptop",
  "hardware",
  "edari",
  "network",
  "accessory",
];

/**
 * واکشی دسته‌های منو جدا از بقیه‌ی چیدمان انجام می‌شود
 * تا پوسته‌ی سایت فوراً رندر شود و هدر پس از دریافت داده جای اسکلتون خودش را بگیرد.
 */
export async function StoreHeader() {
  const categories = (await getAllCategories()).filter(category => HEADER_CATEGORY_SLUGS.includes(decodeSlug(category.slug)));

  return <Header categories={categories} />;
}
