import { getMainCategories } from "@/services/categories";
import { useQuery } from "@tanstack/react-query";



export function useCategories(slugs: string[], ids: number[]) {
  return useQuery({
    queryKey: ["main-categories", slugs],
    queryFn: () => getMainCategories(slugs, ids),
  });
}
