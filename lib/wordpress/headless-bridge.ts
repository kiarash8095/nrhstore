import 'server-only';
import { randomUUID } from 'node:crypto';
import { boundedJson } from '@/lib/http/bounded-json';
import { getWordPressApiUrl } from './config';

export class HeadlessBridgeError extends Error {
  readonly status = 503;
  constructor(public code: string, message: string) { super(message); }
}

// Per-operation preflight: never cache this across a WordPress plugin rollback.
export async function requireHeadlessCapability(headers: Record<string, string>, capability: 'account_lock' | 'cart_merge' | 'checkout') {
  try {
    const url = new URL(getWordPressApiUrl() + '/nrh/v1/capabilities');
    url.searchParams.set('_nrh_request', randomUUID());
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...headers, Origin: url.origin, Accept: 'application/json', 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    if (/hit|stale|updating|revalidated/i.test(['X-LiteSpeed-Cache', 'CF-Cache-Status', 'X-Cache'].map(name => response.headers.get(name)).join(' ')) || Number(response.headers.get('Age')) > 0) throw new Error('Cached capabilities');
    const updateMessage = capability === 'checkout' ? 'افزونهٔ رابط فروشگاه برای ثبت سفارش و توضیحات باید به نسخهٔ ۱٫۴ یا جدیدتر به‌روزرسانی شود.' : 'افزونهٔ رابط فروشگاه باید به نسخهٔ ۱٫۳ یا جدیدتر به‌روزرسانی شود.';
    if (response.status === 404) throw new HeadlessBridgeError('headless_bridge_outdated', updateMessage);
    if (!response.ok) throw new Error('Bridge unavailable');
    const data = await boundedJson(response, 4096) as Record<string, unknown> | null;
    if (!data || data[capability] !== (capability === 'checkout' ? 'bank-and-bacs-v1' : capability === 'cart_merge' ? 'sum-v1' : 'mysql-v1')) {
      throw new HeadlessBridgeError('headless_bridge_outdated', updateMessage);
    }
  } catch (error) {
    if (error instanceof HeadlessBridgeError) throw error;
    throw new HeadlessBridgeError('headless_bridge_unavailable', 'بررسی سرویس هماهنگ‌سازی فروشگاه ممکن نشد. دوباره تلاش کنید.');
  }
}
