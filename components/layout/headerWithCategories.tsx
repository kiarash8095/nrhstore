import Header from "./header";
import { prefetchCategories } from "@/services/categories";

const HEADER_CATEGORY_IDS = [55, 365, 57, 58, 59];
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
export async function HeaderWithCategories() {
  const categories = await prefetchCategories(
    HEADER_CATEGORY_IDS,
    HEADER_CATEGORY_SLUGS,
  );

  return <Header categories={categories} />;
}
