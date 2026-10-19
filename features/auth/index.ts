/**
 * سطح عمومی ماژول احراز هویت.
 *
 * فقط چیزهایی export می‌شوند که بیرون از این پوشه لازم است (هدر، منوی موبایل،
 * صفحه‌ی داشبورد). ماژول‌های داخلی مثل store و mapper عمداً export
 * نمی‌شوند تا کسی از بیرون آن‌ها را دور نزند.
 */

export { AuthAccountButton } from "./components/AuthAccountButton";
export { AuthProvider } from "./components/AuthProvider";
export { LogoutButton } from "./components/LogoutButton";

export { useAuth, getAuthIdentity } from "./hooks/use-auth";
export { useAuthActions } from "./hooks/use-auth-actions";

export type { AuthUser } from "./types/auth-user.types";
