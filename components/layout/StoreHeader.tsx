import { getAllCategories, getHeaderCategories } from "@/features/categories/server";
import Header from "./SiteHeader";

/**
 * واکشی دسته‌های منو جدا از بقیه‌ی چیدمان انجام می‌شود
 * تا پوسته‌ی سایت فوراً رندر شود و هدر پس از دریافت داده جای اسکلتون خودش را بگیرد.
 */
export async function StoreHeader() {
  const categories = getHeaderCategories(await getAllCategories());

  return <Header categories={categories} />;
}
