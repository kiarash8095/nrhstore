import { Category } from "@/types/category";
import api from "./api";

export const getAllCategories = async() => {
    const {data} = await api.get("/products/categories")

    return {data}
}
// const slugs = ["edari", "network", "printer", "hardware", "Accessory"]
export const getMainCategories = async(slugs:string[], ids:number[]) => {
    const {data} = await api.get<Category[]>("/products/categories", {params: {
        parent: 0,
        slug: slugs.join(","),
        include: ids.join(','),

    }})
    console.log("main categories api call");
    return data
}

export const getSubCategories = async(categoryId:number) => {
    const {data} = await api.get<Category[]>("/products/categories", {params: {
        parent: categoryId,
    }})

    return data
}