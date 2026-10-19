"use client";

import { useAuthFlowStore } from "../store/auth-flow.store";

export function useAuthFlow() {
  const state = useAuthFlowStore();
  return {
    ...state,
    canGoBack: state.step !== "phone" && state.step !== "success",
  };
}
