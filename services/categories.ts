import { Category } from "@/types/category";
import api from "./api";

export const getAllCategories = async () => {
  const { data } = await api.get("/products/categories");

  return { data };
};
// const slugs = ["edari", "network", "printer", "hardware", "Accessory"]
// const ids = [365, 55, 59, 57, 58];
export const getMainCategories = async (
  ids: number[],
  slugs?: string[]
): Promise<Category[]> => {
  const params = {
    parent: 0,
    include: ids.join(","),
    ...(slugs?.length ? { slug: slugs.join(",") } : {}),
  };

  const { data } = await api.get<Category[]>(
    "/products/categories",
    {
      params,
    }
  );

  return data;
};

export const getSubCategories = async (categoryIds: number[]) => {
  const promises = categoryIds.map(id => {
    return api.get<Category[]>("/products/categories", {
      params: {
        parent: id,
        hide_empty: false,
      }
    })
  })

  const responses = await Promise.all(promises)
  const allSubCategories = responses.flatMap(response => response.data)

  return allSubCategories
  
};


