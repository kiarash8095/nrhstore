import type { AuthUserDto } from "@/features/auth/contracts";

/**
 * مدل کاربر در دامنه‌ی رابط کاربری.
 * عمداً همان شکل DTO قرارداد است تا دو مدل موازی و واگرا نداشته باشیم؛
 * نرمال‌سازی داده سمت سرور (mapper) انجام می‌شود.
 */
export type AuthUser = AuthUserDto;

export interface AuthSession {
  user: AuthUser;
}
