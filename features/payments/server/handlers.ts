import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getCartAuthContext } from '@/features/auth/server';
import { getWordPressApiUrl } from '@/lib/wordpress/config';
import { consumeRateLimit } from '@/lib/server/rate-limit';
import { paymentStatusSchema } from '../contracts';
import { boundedJson } from '@/lib/http/bounded-json';
import { isTrustedOriginRequest } from '@/lib/http/request-origin';
import { CartLockBusyError, withCartLocks } from '@/features/cart/server';

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: {
    'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer',
  } });
}

export async function paymentStatusHandler(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[1-9][0-9]{0,14}$/.test(id) || !Number.isSafeInteger(Number(id))) return json({ message: 'سفارش پیدا نشد.' }, 404);
  if (!isTrustedOriginRequest(request)) {
    return json({ message: 'مبدأ درخواست معتبر نیست.' }, 403);
  }
  if (request.method === 'POST') {
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({ message: 'درخواست معتبر نیست.' }, 400);
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      if (!reader) throw new Error('Missing body');
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 32) { await reader.cancel(); return json({ message: 'درخواست معتبر نیست.' }, 413); }
        chunks.push(part.value);
      }
      if (Buffer.concat(chunks).toString('utf8') !== '{}') return json({ message: 'درخواست معتبر نیست.' }, 400);
    } catch { return json({ message: 'درخواست معتبر نیست.' }, 400); }
    finally { reader?.releaseLock(); }
  }
  try {
    const auth = await getCartAuthContext(request);
    if (!auth) return json({ message: 'برای مشاهده سفارش وارد حساب شوید.' }, 401);
    if (!consumeRateLimit('payment-status:' + auth.userId, 30, 60_000).allowed) return json({ message: 'کمی صبر کنید.' }, 429);
    const readStatus = async () => {
      const upstream = await fetch(`${getWordPressApiUrl()}/nrh/v1/orders/${id}?_nrh=${crypto.randomUUID()}`, {
        method: request.method, headers: { ...auth.headers, Accept: 'application/json', 'Cache-Control': 'no-cache, no-store', ...(request.method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
        body: request.method === 'POST' ? '{}' : undefined, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20000),
      });
      if (!upstream.ok) return json({ message: upstream.status === 404 ? 'سفارش پیدا نشد.' : 'دریافت وضعیت سفارش ممکن نشد.' }, upstream.status === 404 ? 404 : 502);
      if (/hit/i.test([upstream.headers.get('X-LiteSpeed-Cache'), upstream.headers.get('CF-Cache-Status')].join(' '))) throw new Error('Cached private response');
      const parsed = paymentStatusSchema.safeParse(await boundedJson(upstream, 49152));
      if (!parsed.success || parsed.data.order_id !== Number(id)) throw new Error('Invalid order response');
      return json(parsed.data);
    };
    // POST can empty the paid order's cart in WordPress. Serialize it with cart
    // mutations across tabs and Node workers, using the same account identity.
    // The WordPress order endpoint holds the same database account lock as cart
    // writes and merge while checking/clearing a paid cart.
    return request.method === 'POST' ? await withCartLocks(['cart:' + auth.userId], readStatus, { upstream: true }) : await readStatus();
  } catch (error) {
    if (error instanceof CartLockBusyError) return json({ message: 'سبد در حال به‌روزرسانی است. کمی بعد وضعیت پرداخت را دوباره بررسی کنید.' }, 409);
    return json({ message: 'ارتباط با فروشگاه ممکن نشد. وضعیت پرداخت هنوز تأیید نشده است.' }, 502);
  }
}
