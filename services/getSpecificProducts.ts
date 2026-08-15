import { Products } from "@/types/products"
import api from "./api"


export const getSpecificProducts= async(id:number) =>
{

    const start = Date.now()
    try
    {

        const {data} = await api.get<Products[]>(`/products?category=${id}`)
        console.log(`getSpecificProducts(${id}): ${Date.now() - start}ms`)
        return data || []
    }
    catch(error)
    {
        console.error(`getSpecificProducts(${id}): FAILED after ${Date.now() - start}ms`, error)
        throw error;
    }

 }