'use client';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

// Each streamed consumer first renders the same placeholder as its own server HTML.
export function useHydrated() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
