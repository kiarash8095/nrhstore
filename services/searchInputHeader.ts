import api from "./api"

export const getSearchResult = async(word:string) => {
    const {data} = await api.get(`/products?search=${word}`)

    return data
} 