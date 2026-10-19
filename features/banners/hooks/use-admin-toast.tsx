"use client";

import { CheckCircle2,CircleAlert,X } from "lucide-react";
import { useEffect,useState } from "react";

type Toast = { message: string; kind: "success" | "error" };

export function useAdminToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  return {
    notify: (message: string, kind: Toast["kind"] = "success") => setToast({ message, kind }),
    toastElement: toast ? (
      <div role={toast.kind === "error" ? "alert" : "status"} aria-live={toast.kind === "error" ? "assertive" : "polite"}
        className={`fixed bottom-24 right-4 left-4 z-[100] flex items-start gap-3 rounded-2xl border p-4 shadow-xl sm:right-6 sm:left-auto sm:max-w-md ${toast.kind === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
        {toast.kind === "error" ? <CircleAlert className="mt-0.5 size-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-5 shrink-0" />}
        <p className="text-sm leading-7">{toast.message}</p>
        <button type="button" onClick={() => setToast(null)} aria-label="بستن پیام" className="mr-auto rounded-lg p-1 hover:bg-black/5"><X className="size-4" /></button>
      </div>
    ) : null,
  };
}
