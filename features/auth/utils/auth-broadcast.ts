"use client";

const CHANNEL_NAME = "nrh-auth";
export type AuthBroadcastEvent = "login" | "logout";

export function broadcastAuthEvent(event: AuthBroadcastEvent) {
  try {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(event);
    channel.close();
  } catch { /* A notification failure must not make a successful login fail. */ }
}

export function subscribeAuthBroadcast(handler: (event: AuthBroadcastEvent) => void): () => void {
  try {
    if (typeof BroadcastChannel === "undefined") return () => {};
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (message: MessageEvent<unknown>) => {
      if (message.data === "login" || message.data === "logout") handler(message.data);
    };
    return () => channel.close();
  } catch { return () => {}; }
}
