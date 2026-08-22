const WC_API_URL = process.env.NEXT_PUBLIC_BASE_URL

export async function wcFetch<T>(endpoint: string, options?:RequestInit): Promise<T>
{

    const url = `${WC_API_URL}${endpoint}`
    console.log("WC_API_URL:", WC_API_URL)
    console.log("WC_ENDPOINT:", endpoint)
    console.log("WC_FINAL_URL:", url)

    try{
        const start = Date.now()
        const res = await fetch(url, options)

        console.log(`WC response: ${res.status} - ${Date.now() - start}ms`)

        if(!res.ok)
        {
            throw new Error(`Woocomerce api error: ${res.status}`)
        }

        return res.json()
    }
    catch(error) {
        console.error("woocomerce fetch failed!", url, error)
        throw error
    }
}