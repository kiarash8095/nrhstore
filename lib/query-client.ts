import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
return new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 10,
            gcTime: 1000 * 60 * 30,
            retry: 1,
            refetchOnWindowFocus: false,
        }
    }
})
}

let browserQueryClient :QueryClient | undefined = undefined

export function getQueryClient()
{
    if(typeof(window) === "undefined")
    {
        return makeQueryClient()
    }
    if(!browserQueryClient)
    {
        browserQueryClient = makeQueryClient()
    }
    return browserQueryClient
}



