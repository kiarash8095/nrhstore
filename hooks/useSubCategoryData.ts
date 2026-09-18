import { getSubCategories } from "@/services/categories";
import { Category } from "@/types/category-types";
import { useQuery } from "@tanstack/react-query";

export function useSubCategoryData(activeCategory: Category) {
  const { data } = useQuery({
    queryKey: ["sub-categories", activeCategory?.id],
    queryFn: () => getSubCategories(activeCategory!.id),
    enabled: !!activeCategory,
  });

  return data;
}
