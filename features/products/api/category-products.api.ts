import type { ProductCardData } from "@/features/products/types/product.types";
import { wcFetch } from "@/lib/woocommerce/store-client";
import { PRODUCT_CARD_FIELDS } from "../constants/catalog";

// export const getSpecificProducts= async(id:number) =>
// {

//     const start = Date.now()
//     try
//     {

//         const {data} = await api.get<Products[]>(`/products?category=${id}`, {
//             params: {
//                 per_page: 10,
//             }
//         })
//         console.log(`getSpecificProducts(${id}): ${Date.now() - start}ms`)
//         return data || []
//     }
//     catch(error)
//     {
//         console.error(`getSpecificProducts(${id}): FAILED after ${Date.now() - start}ms`, error)
//         throw error;
//     }

//  }

export const getSpecificProducts = async (
  id: number,
  limit: number = 10,
): Promise<ProductCardData[]> => {
  const params = new URLSearchParams({
    category: String(id),
    per_page: String(limit),
    _fields: PRODUCT_CARD_FIELDS,
  });
  return wcFetch<ProductCardData[]>(`/products?${params.toString()}`, {
    next: {
      revalidate: 300,
    },
  });
};
