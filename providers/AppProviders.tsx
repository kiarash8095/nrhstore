"use client";

import { AuthProvider } from "@/features/auth";
import { CartProvider } from '@/features/cart';
import type { ReactNode } from "react";
import ReactQueryProvider from "./ReactQueryProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return <ReactQueryProvider><AuthProvider><CartProvider>{children}</CartProvider></AuthProvider></ReactQueryProvider>;
}
