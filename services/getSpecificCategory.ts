
import { Category } from "@/types/category"
import api from "./api"


export const getSpecificCategory = async(id:number) =>
{
    const {data} = await api.get<Category>(`/products/categories`, {
        params:{
            include: id,
            hide_empty: false,
        }
    })

    return data
}