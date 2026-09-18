import { getSpecificProducts } from "@/services/getSpecificProducts";
import { Products } from "@/types/products-types";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Categories } from "@/components/modules/mainPage/Categories";
import { EdariProducts } from "@/components/modules/mainPage/EdariProducts";
import { Laptops } from "@/components/modules/mainPage/Laptops";
import { NetworkProducts } from "@/components/modules/mainPage/NetworkProducts";
import { Accessories } from "@/components/modules/mainPage/Accessories";
import { JanebiProducts } from "@/components/modules/mainPage/JanebiProducts";

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
    queryFn: () => getSpecificProducts(id),
  });

  return data;
}
