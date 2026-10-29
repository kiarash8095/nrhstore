'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function StoreOnly({ children }: { children: ReactNode }) {
  const path = usePathname();
  return path === '/account' || path.startsWith('/account/') ? null : children;
}
