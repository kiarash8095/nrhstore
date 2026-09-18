import { getAllCategories } from "@/services/categories";
import type { Category } from "@/types/category-types";

import { CategoryCard } from "./CategoryCard";

/** سبد پیش‌فرض ووکامرس برای محصولات بدون دسته؛ در فهرست دسته‌ها نمایش داده نمی‌شود */
const UNCATEGORIZED_SLUG = "دسته-بندی-نشده";

function isUncategorized(category: Category) {
  try {
    return decodeURIComponent(category.slug) === UNCATEGORIZED_SLUG;
  } catch {
    return false;
  }
}

const byProductCount = (a: Category, b: Category) =>
  (b.count ?? 0) - (a.count ?? 0);

/**
 * چیدمان سلسله‌مراتبی: هر دسته‌ی اصلی و بلافاصله زیردسته‌هایش،
 * و در هر گروه دسته‌های پرمحصول‌تر جلوتر می‌آیند.
 */
function orderCategories(categories: Category[]) {
  const ordered: Category[] = [];

  categories
    .filter((category) => category.parent === 0)
    .sort(byProductCount)
    .forEach((root) => {
      ordered.push(root);
      ordered.push(
        ...categories
          .filter((category) => category.parent === root.id)
          .sort(byProductCount),
      );
    });

  // زیردسته‌هایی که والدشان در این فهرست نیست هم نمایش داده می‌شوند
  const seen = new Set(ordered.map((category) => category.id));
  ordered.push(
    ...categories
      .filter((category) => !seen.has(category.id))
      .sort(byProductCount),
  );

  return ordered;
}

export async function CategoriesGrid() {
  const allCategories = await getAllCategories();
  const categories = orderCategories(
    allCategories.filter((category) => !isUncategorized(category)),
  );

  if (categories.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 py-14 text-center text-sm text-gray-500">
        دسته‌ای برای نمایش وجود ندارد.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
}
