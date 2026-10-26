"use client";
import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export function BlogShareButton() {
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  async function share() {
    try {
      await navigator.clipboard.writeText(
        window.location.origin + window.location.pathname,
      );
      setCopied(true);
      setMessage("لینک مقاله کپی شد.");
    } catch {
      setMessage(
        "کپی خودکار ممکن نیست؛ آدرس مقاله را از نوار مرورگر کپی کنید.",
      );
    }
  }
  return (
    <div className="mt-5 border-t border-gray-100 pt-5">
      <button
        type="button"
        onClick={() => void share()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-xs font-bold text-gray-600 transition hover:border-orange-200 hover:text-orange-600"
      >
        {copied ? (
          <Check className="size-4 text-emerald-600" aria-hidden="true" />
        ) : (
          <Share2 className="size-4" aria-hidden="true" />
        )}
        اشتراک‌گذاری مقاله
        <Copy className="ms-auto size-3.5" aria-hidden="true" />
      </button>
      <p role="status" className="mt-2 text-[11px] leading-6 text-gray-500">
        {message}
      </p>
    </div>
  );
}
