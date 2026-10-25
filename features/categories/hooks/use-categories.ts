import { getMainCategories } from "@/features/categories/api/categories.client";
import { useQuery } from "@tanstack/react-query";



export function useCategories(slugs: string[], ids: number[]) {
  return useQuery({
    queryKey: ["main-categories", { ids, slugs }],
    queryFn: ({ signal }) => getMainCategories(ids, slugs, signal),
  });
}
