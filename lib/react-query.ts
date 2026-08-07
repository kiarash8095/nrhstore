import { QueryClient } from "@tanstack/react-query";

export function MakeQueryClient() {
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
        return MakeQueryClient()
    }
    if(!browserQueryClient)
    {
        browserQueryClient = MakeQueryClient()
    }
    return browserQueryClient
}



