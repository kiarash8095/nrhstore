"use client";

export class AdminRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function adminRequest<T>(url: string, options: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...options, cache: "no-store", credentials: "same-origin" });
  } catch {
    throw new AdminRequestError("ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.", 0);
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new AdminRequestError(result?.message || "عملیات انجام نشد؛ دوباره تلاش کنید.", response.status);
  if (!result) throw new AdminRequestError("پاسخ سرور معتبر نیست.", 502);
  return result as T;
}
