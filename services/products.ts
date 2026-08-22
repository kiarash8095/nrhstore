import { Products } from "@/types/products";
import api from "./api";


export const getProducts = async() => {
    const {data} = await api.get("/products")

    return data
}

export const getProductDetails = async(slug: string) => 
{
    const {data} = await api.get<Products>(`/products/${slug}`)

    return data
}