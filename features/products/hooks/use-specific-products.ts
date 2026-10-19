import api from "@/lib/http/client";
import { Products } from "@/features/products/types/product.types";
import { useQuery } from "@tanstack/react-query";

// const CATEGORIES = [
//     {id:55, name:'laptops', Component:Laptops},
//     {id:58, name:'network', Component:NetworkProducts},
//     {id:59, name:'accessory', Component:Accessories},
//     {id:57, name:'edari', Component:EdariProducts},
//     {id:55, name:'janebi', Component:JanebiProducts},
// ]

export function useSpecificProducts(id: number, slug: string) {
  const data = useQuery<Products[]>({
    queryKey: ["specific-products", slug],
    queryFn: async () => (await api.get<Products[]>('/products', { params: { category: id, per_page: 10 } })).data,
  });

  return data;
}
