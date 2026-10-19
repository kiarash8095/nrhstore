"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

// Streamed form HTML can appear before React is ready to handle its events.
// Keep editable controls disabled until hydration to avoid losing early edits.
export function useHydrated() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
