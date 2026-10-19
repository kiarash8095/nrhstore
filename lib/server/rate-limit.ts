/**
 * محدودکننده‌ی نرخ درون‌حافظه‌ای (best-effort).
 *
 * ⚠️ این پیاده‌سازی فقط در یک instance معنا دارد؛ روی هاست‌های چند-instance
 * (یا serverless) باید با یک store مشترک مثل Redis جایگزین شود. هدفش این است که
 * در همین وضعیت هم جلوی ساده‌ترین سوءاستفاده‌ها (SMS bombing و brute-force رمز) گرفته شود.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** هر چند درخواست یک‌بار سطل‌های منقضی پاک می‌شوند تا Map بی‌نهایت رشد نکند */
const SWEEP_INTERVAL = 200;
let sinceLastSweep = 0;

function sweep(now: number): void {
  sinceLastSweep += 1;
  if (sinceLastSweep < SWEEP_INTERVAL) return;

  sinceLastSweep = 0;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** ثانیه‌های باقی‌مانده تا مجاز شدن دوباره */
  retryAfter: number;
  remaining: number;
}

/**
 * یک «مصرف» از سطل کلید داده‌شده برمی‌دارد.
 * key باید شامل نوع عملیات و شناسه باشد، مثل `otp:09123456789`.
 */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    retryAfter: 0,
    remaining: Math.max(0, limit - existing.count),
  };
}

/** خواندن وضعیت سطل بدون مصرف کردن آن (برای نمایش شمارش معکوس) */
export function peekRateLimit(key: string): number {
  const bucket = buckets.get(key);
  if (!bucket) return 0;
  const remainingMs = bucket.resetAt - Date.now();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

/** پاک‌کردن سطل مربوط به یک کلید؛ بعد از موفقیت (مثل تایید درست کد) صدا زده می‌شود */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** فقط برای تست */
export function clearAllRateLimits(): void {
  buckets.clear();
}
