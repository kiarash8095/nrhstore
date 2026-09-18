import { Products } from "@/types/products-types";
import api from "./api";
import { wcFetch } from "./client";

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
): Promise<Products[]> => {
  const params = new URLSearchParams({
    category: String(id),
    per_page: String(limit),
  });
  return wcFetch<Products[]>(`/products?${params.toString()}`, {
    next: {
      revalidate: 300,
    },
  });
};
