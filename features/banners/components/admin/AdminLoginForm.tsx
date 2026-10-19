"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye,EyeOff,Loader2,ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState,type FormEvent } from "react";
import { adminRequest } from "../../api/admin.api";
import { useAdminToast } from "../../hooks/use-admin-toast";
import { useHydrated } from "../../hooks/use-hydrated";

export function AdminLoginForm({ configured }: { configured: boolean }) {
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { notify, toastElement } = useAdminToast();

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setError("");
    setBusy(true);
    try {
      await adminRequest("/api/banners-admin/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      window.location.replace("/banners-admin");
    } catch (error) {
      const message = error instanceof Error ? error.message : "ورود انجام نشد.";
      setError(message);
      notify(message, "error");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-14" dir="rtl">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-slate-900 text-white"><ShieldCheck className="size-7" /></div>
        <h1 className="text-2xl font-bold text-slate-900">ورود به مدیریت بنرها</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">برای مدیریت تصاویر صفحه اصلی، با حساب مدیر وارد شوید.</p>
        {!configured && <p role="alert" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-900">ورود مدیر هنوز فعال نشده است. تنظیمات ورود باید روی سرور تکمیل شوند.</p>}
        <form onSubmit={login} className="mt-7 space-y-5">
          <fieldset disabled={busy || !configured || !hydrated} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="admin-username" className="text-sm font-medium">نام کاربری</label>
              <Input id="admin-username" name="username" autoComplete="username" dir="ltr" required maxLength={100} className="h-12 rounded-xl border-slate-200" />
            </div>
            <div className="space-y-2">
              <label htmlFor="admin-password" className="text-sm font-medium">رمز عبور</label>
              <div className="relative">
                <Input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" dir="ltr" required maxLength={256} className="h-12 rounded-xl border-slate-200 pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"} aria-pressed={showPassword} className="absolute top-3 right-3 text-slate-500">
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>
            {error && <p role="alert" className="text-sm leading-7 text-red-600">{error}</p>}
            <Button type="submit" className="h-12 w-full rounded-xl bg-slate-900 text-white">{busy && <Loader2 className="size-4 animate-spin" />} {busy ? "در حال ورود…" : "ورود به پنل"}</Button>
          </fieldset>
        </form>
        <Link href="/" className="mt-6 block text-center text-sm text-slate-500 hover:text-slate-900">بازگشت به فروشگاه</Link>
      </div>
      {toastElement}
    </main>
  );
}
