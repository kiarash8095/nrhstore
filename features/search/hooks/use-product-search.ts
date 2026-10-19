"use client";

import { useDebounce } from "@/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";
import { useEffect,useState,type ChangeEvent } from "react";
import { getSearchResult } from "../api/search.api";
import type { SearchResult } from "../types/search-result.types";

export function useProductSearch() {
  const [input, setInput] = useState("");
  const [isInputOpen, setIsInputOpen] = useState(false);
  const debouncedInput = useDebounce(input, 500);
  const { data: searchData = [], isPending: searchLoading, isFetching } = useQuery<SearchResult[]>({
    queryKey: ["get-search-result", debouncedInput],
    queryFn: () => getSearchResult(debouncedInput),
    enabled: debouncedInput.trim().length > 0,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!isInputOpen || !window.matchMedia("(max-width: 639px)").matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isInputOpen]);

  return {
    input, setInput, isInputOpen, setIsInputOpen, debouncedInput,
    searchData, searchLoading, isSearchRefreshing: isFetching && !searchLoading,
    handleSearchInput: (event: ChangeEvent<HTMLInputElement>) => setInput(event.target.value),
    closeSearch: () => setIsInputOpen(false),
  };
}
