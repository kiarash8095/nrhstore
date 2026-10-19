"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authApi } from "../api/auth.api";
import { useAuthFlowStore } from "../store/auth-flow.store";
import { useAuthSessionStore } from "../store/auth-session.store";
import { subscribeAuthBroadcast } from "../utils/auth-broadcast";
import { AuthModal } from "./AuthModal";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    async function refresh() {
      if (!active || document.visibilityState === "hidden") return;
      const requestId = ++latestRequest;
      const snapshot = useAuthSessionStore.getState();
      try {
        const session = await authApi.getSession();
        // Ignore superseded reads and never overwrite a newer login/logout.
        if (!active || requestId !== latestRequest || useAuthSessionStore.getState() !== snapshot) return;
        if (session) useAuthSessionStore.getState().setSession(session);
        else {
          useAuthSessionStore.getState().setGuest();
          if (snapshot.status === "authenticated") { queryClient.clear(); router.refresh(); }
        }
      } catch {
        if (active && requestId === latestRequest && useAuthSessionStore.getState() === snapshot && snapshot.status === "unknown") {
          useAuthSessionStore.getState().setGuest();
        }
      }
    }
    const unsubscribe = subscribeAuthBroadcast(() => {
      // Broadcasts carry no session data; always verify the shared cookie on server.
      queryClient.clear();
      void refresh();
      router.refresh();
    });
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 60_000);
    void refresh();
    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, queryClient]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") !== "login") return;
    useAuthFlowStore.getState().open({ nextPath: params.get("next") });
    params.delete("auth");
    params.delete("next");
    const search = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`);
  }, []);

  return <>{children}<AuthModal /></>;
}
