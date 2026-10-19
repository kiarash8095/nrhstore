"use client";

import { createContext,useContext,type ReactNode } from "react";
import { useProductSearch } from "../hooks/use-product-search";

const SearchContext = createContext<ReturnType<typeof useProductSearch> | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const search = useProductSearch();
  return <SearchContext.Provider value={search}>{children}</SearchContext.Provider>;
}

export function useSearchContext() {
  const context = useContext(SearchContext);
  if (!context) throw new Error("Search components require SearchProvider.");
  return context;
}
