"use client"

import { getQueryClient } from "@/lib/query-client"
import { QueryClientProvider } from "@tanstack/react-query"
import React,{ useState } from "react"

export default function ReactQueryProvider({children}: {children: React.ReactNode})
{
    const [queryClient] = useState(getQueryClient)
    return(
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}
