import { LogoutButton } from "@/features/auth";
import { maskIranMobile } from "@/features/auth/contracts";
import { requireUser } from "@/features/auth/server";

export default async function DashboardPage() {
  // محافظت واقعی سمت سرور: Proxy فقط وجود کوکی را چک می‌کند،
  // اعتبارسنجی نشست همین‌جا و نزدیک به داده انجام می‌شود.
  const user = await requireUser("/dashboard");

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <main className="mx-auto w-[92%] max-w-[1400px] py-8">
      <h1 className="text-lg font-bold text-gray-800">داشبورد کاربری</h1>

      <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">خوش آمدید</p>
        <p className="mt-1 text-base font-bold text-gray-800">
          {fullName || "کاربر نوین رایانه"}
        </p>
        <p className="mt-2 text-xs text-gray-400" dir="ltr">
          {user.phone ? maskIranMobile(user.phone) : user.email}
        </p>
      </div>
      <LogoutButton />
    </main>
  );
}
