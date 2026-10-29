'use client';
import type { z } from 'zod';
import { getAuthIdentity } from '@/features/auth';
import { withStoreSessionLock } from '@/lib/http/store-session-lock';

export class AccountClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
export async function accountRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  {
    method = 'GET',
    body,
    signal,
  }: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const identity = getAuthIdentity();
  const run = async () => {
    if (getAuthIdentity() !== identity || identity === 'guest')
      throw new AccountClientError(
        'برای ادامه وارد حساب شوید.',
        401,
        'session_expired',
      );
    let response: Response;
    try {
      response = await fetch('/api/account/' + path, {
        method,
        headers: {
          'X-NRH-Account-Identity': identity,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        credentials: 'same-origin',
        cache: 'no-store',
        body: body === undefined ? undefined : JSON.stringify(body),
        signal:
          method === 'GET' && signal
            ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
            : AbortSignal.timeout(45000),
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new AccountClientError(
        'ارتباط قطع شد. اطلاعات را تازه‌سازی کنید و نتیجه را بررسی کنید.',
        0,
        'network_error',
      );
    }
    if (getAuthIdentity() !== identity)
      throw new AccountClientError(
        'حساب فعال تغییر کرده است.',
        409,
        'session_changed',
      );
    const value = await response.json().catch(() => null);
    if (!response.ok)
      throw new AccountClientError(
        value?.message || 'دریافت اطلاعات ممکن نشد.',
        response.status,
        value?.code || 'account_error',
      );
    const result = schema.safeParse(value);
    if (!result.success)
      throw new AccountClientError(
        'پاسخ حساب کاربری معتبر نیست. دوباره تلاش کنید.',
        502,
        'invalid_response',
      );
    return result.data;
  };
  return method === 'GET' ? run() : withStoreSessionLock(run);
}
