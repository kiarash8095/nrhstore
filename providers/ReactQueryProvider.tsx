"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { getQueryClient } from "@/lib/react-query"
import React, { useState } from "react"

export default function ReactQueryProvider({children}: {children: React.ReactNode})
{
    const [queryClient] = useState(getQueryClient)
    return(
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}