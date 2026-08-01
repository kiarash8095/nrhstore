import api from "./api";


export const getProducts = async() => {
    const {data} = await api.get("/products")

    return data
}

export const getProductDetails = async(slug: string) => 
{
    const {data} = await api.get(`/products/${slug}`)

    return data
}