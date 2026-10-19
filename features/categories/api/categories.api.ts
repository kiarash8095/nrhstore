import { Category,SubCategory } from "@/features/categories/types/category.types";
import { wcFetch, wcResponse } from "@/lib/woocommerce/store-client";
import { cache } from "react";

export const getAllCategories = cache(async (): Promise<Category[]> => {
  const response = await wcResponse('/products/categories?per_page=100&hide_empty=false', { next: { tags: ['all-categories'] } });
  const categories = await response.json() as Category[];
  if (!Array.isArray(categories)) throw new Error('Invalid category response.');
  const pages = Number(response.headers.get('X-WP-TotalPages') || 1);
  for (let page = 2; page <= pages; page++) categories.push(...await wcFetch<Category[]>(`/products/categories?per_page=100&hide_empty=false&page=${page}`));
  return categories;
});
// const slugs = ["edari", "network", "printer", "hardware", "Accessory"]
// const ids = [365, 55, 59, 57, 58];

// export const getMainCategories = async (
//   ids: number[],
//   slugs?: string[]
// ): Promise<Category[]> => {
//   const params = {
//     parent: 0,
//     include: ids.join(","),
//     ...(slugs?.length ? { slug: slugs.join(",") } : {}),
//   };

//   const { data } = await api.get<Category[]>(
//     "/products/categories",
//     {
//       params,
//     }
//   );

//   return data;
// };

// export const getMainCategories = async(ids: number[], slugs?: string[]): Promise<Category[]> =>
// {

//   const params = new URLSearchParams({
//     parent: "0",
//     include: ids.join(','),
//   })

//   if (slugs?.length) {
//     params.set("slug", slugs.join(","));
//   }

//   return wcFetch<Category[]>(`/products/categories?${params.toString()}`, {next: {
//     revalidate: 300,
//   }})
// }

export const getMainCategories = cache(
  async (ids: number[], slugs?: string[]): Promise<Category[]> => {
    const params = new URLSearchParams({
      parent: "0",
      include: ids.join(","),
    });

    if (slugs?.length) {
      params.set("slug", slugs.join(","));
    }

    try {
      const response = await wcFetch<Category[]>(
        `/products/categories?${params.toString()}`,
        {
          next: {
            // استراتژی کش هوشمندتر
            revalidate:
              process.env.NEXT_PUBLIC_BASE_URL === "production" ? 3600 : 60, // ۱ ساعت در تولید، ۱ دقیقه در توسعه
            tags: ["main-categories"], // برای invalidate دستی
          },
        },
      );

      // کش کردن با Map برای استفاده در کل برنامه
      return response;
    } catch (error) {
      console.error("Error fetching main categories:", error);
      return []; // برگرداندن آرایه خالی در صورت خطا
    }
  },
);

export const getCategoriesWithId = async (
  ids: number[],
): Promise<Category[]> => {
  const params = new URLSearchParams({
    include: ids.join(","),
  });

  try {
    const response = await wcFetch<Category[]>(
      `/products/categories?${params.toString()}`,
      {
        next: {
          revalidate:
            process.env.NEXT_PUBLIC_BASE_URL === "production" ? 3600 : 60,
          tags: ["categories-with-id"],
        },
      },
    );
    return response;
  } catch (error) {
    console.log("Error occured in getting categories with ids ", error);
    return [];
  }
};

export const prefetchCategories = async (ids: number[], slugs?: string[]) => {
  // این تابع برای استفاده در layout یا page برای prefetch کردن
  const categories = await getMainCategories(ids, slugs);

  // Prefetch کردن زیردسته‌ها در پس‌زمینه
  if (categories.length > 0) {
    // فقط برای اولین دسته‌بندی prefetch انجام بده
    const firstCategory = categories[0];
    if (firstCategory?.id) {
      // این کار رو در پس‌زمینه انجام بده و منتظر نتیجه نباش
      getSubCategories(firstCategory.id).catch(() => {});
    }
  }

  return categories;
};

export const getSubCategories = cache(
  async (categoryId: number): Promise<SubCategory[]> => {
    try {
      const params = new URLSearchParams({
        parent: categoryId.toString(),
        hide_empty: "false",
        per_page: "20", // محدود کردن تعداد نتایج
        order: "asc",
        orderby: "name",
      });
      const res = await wcFetch<SubCategory[]>(
        `/products/categories?${params.toString()}`,
      );

      return res || [];
    } catch (error) {
      console.error(`Error fetching subcategories for ${categoryId}:`, error);
      return []; // برگرداندن آرایه خالی به جای کرش
    }
  },
);

// export const getSubCategories = async (categoryId: number) => {
//   const {data} = await api.get<SubCategory[]>("/products/categories", {
//       params: {
//         parent: categoryId,
//         hide_empty: false,
//       }
//     })

//     return data

// };
