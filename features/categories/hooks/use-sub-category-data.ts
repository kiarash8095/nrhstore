import { getSubCategories } from "@/features/categories/api/categories.client";
import { Category } from "@/features/categories/types/category.types";
import { useQuery } from "@tanstack/react-query";

export function useSubCategoryData(activeCategory: Category | null) {
  const { data } = useQuery({
    queryKey: ["sub-category", activeCategory?.id],
    queryFn: ({ signal }) => getSubCategories(activeCategory!.id, signal),
    enabled: !!activeCategory?.id,
  });

  return data;
}
