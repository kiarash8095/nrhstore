import api from "@/lib/http/client"

export const getSearchResult = async(word:string) => {
    const {data} = await api.get('/products', { params: { search: word, per_page: 10 } })

    return data
} 
