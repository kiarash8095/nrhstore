import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getCartAuthContext } from '@/features/auth/server';
import { getStoreApiUrl } from '@/lib/wordpress/config';
import { consumeRateLimit } from '@/lib/server/rate-limit';
import { addItemSchema, updateItemSchema, itemKeySchema, couponSchema, customerSchema, shippingSchema } from '../contracts';
import type { WooCommerceCart } from '../types/woocommerce.types';
import { cartTokenIdentity, CartLockBusyError, withCartLocks } from './cart-lock';

const GUEST_COOKIE = 'nrh_cart_guest';
const tokenPattern = /^[a-zA-Z0-9_.-]{20,3800}$/;
const emptySchema = z.object({}).strict();
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' } });
}
class CartError extends Error {
  constructor(public status: number, public code: string, message: string, public cart?: WooCommerceCart) { super(message); }
}
function isCart(value: unknown): value is WooCommerceCart {
  if (!value || typeof value !== 'object') return false;
  const cart = value as WooCommerceCart;
  return Array.isArray(cart.items) && Array.isArray(cart.coupons) && !!cart.totals && typeof cart.totals.total_price === 'string' && typeof cart.items_count === 'number';
}
function readableMessage(value: unknown) {
  return typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/&[^;]{1,12};/g, ' ').slice(0, 350) : 'انجام درخواست سبد خرید ممکن نشد.';
}
function tokenFrom(request: NextRequest, name: string) {
  const value = request.cookies.get(name)?.value;
  return value && tokenPattern.test(value) ? value : undefined;
}

class CartConnection {
  constructor(public token?: string, private headers: Record<string, string> = {}) {}
  async send(path: string, method = 'GET', body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      const url = new URL(getStoreApiUrl() + path);
      // The live LiteSpeed cache serves stale /cart responses even with no-store.
      // A unique GET URL also keeps initial anonymous Cart-Tokens isolated.
      if (method === 'GET') url.searchParams.set('_nrh_request', randomUUID());
      response = await fetch(url, {
        method, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache', ...this.headers, ...(this.token ? { 'Cart-Token': this.token } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch { throw new CartError(502, 'cart_connection_failed', 'ارتباط با فروشگاه قطع شد. پیش از تلاش دوباره، سبد را تازه‌سازی کنید.'); }
    if (method === 'GET' && /hit/i.test(response.headers.get('X-LiteSpeed-Cache') || response.headers.get('CF-Cache-Status') || '')) {
      throw new CartError(502, 'cart_cache_misconfigured', 'دریافت نسخه به‌روز سبد ممکن نشد. لطفاً کمی بعد دوباره تلاش کنید.');
    }
    const token = response.headers.get('Cart-Token');
    if (token && tokenPattern.test(token)) this.token = token;
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      throw new CartError(response.status >= 500 ? 502 : response.status,
        typeof data?.code === 'string' ? data.code : 'cart_request_failed',
        response.status >= 500 ? 'فروشگاه موقتاً در دسترس نیست. دوباره تلاش کنید.' : readableMessage(data?.message),
        isCart(data?.data?.cart) ? data.data.cart : undefined);
    }
    if (data === null && response.status !== 204) throw new CartError(502, 'invalid_cart_response', 'پاسخ فروشگاه معتبر نیست.');
    return data;
  }
  async cart(): Promise<WooCommerceCart> {
    const data = await this.send('/cart');
    if (!isCart(data) || !this.token) throw new CartError(502, 'invalid_cart_response', 'دریافت نشست معتبر سبد ممکن نشد.');
    return data;
  }
}

type Operation = 'get' | 'add-item' | 'update-item' | 'remove-item' | 'clear' | 'apply-coupon' | 'remove-coupon' | 'update-customer' | 'select-shipping-rate' | 'prepare-checkout';
function handler(operation: Operation, schema: z.ZodType = emptySchema) {
  return async (request: NextRequest) => {
    const origin = request.headers.get('origin');
    if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== request.nextUrl.origin)) {
      return json({ code: 'forbidden_origin', message: 'مبدأ درخواست معتبر نیست.' }, 403);
    }
    const limit = consumeRateLimit('cart:' + (request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'), 240, 60_000);
    if (!limit.allowed) { const response = json({ code: 'rate_limited', message: 'کمی صبر کنید و دوباره تلاش کنید.' }, 429); response.headers.set('Retry-After', String(limit.retryAfter)); return response; }
    let input: unknown;
    if (operation !== 'get') {
      if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({ code: 'invalid_input', message: 'فرمت درخواست معتبر نیست.' }, 415);
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = []; let size = 0;
      try {
        if (!reader) throw new Error();
        while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 16384) { await reader.cancel(); return json({ code: 'invalid_input', message: 'درخواست بیش از حد بزرگ است.' }, 413); } chunks.push(part.value); }
        const parsed = schema.safeParse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        if (!parsed.success) return json({ code: 'invalid_input', message: 'اطلاعات درخواست معتبر نیست.' }, 400);
        input = parsed.data;
      } catch { return json({ code: 'invalid_input', message: 'اطلاعات درخواست معتبر نیست.' }, 400); }
      finally { reader?.releaseLock(); }
    }
    let connection: CartConnection | undefined;
    let cookieName = GUEST_COOKIE;
    let pending = false;
    let dropEmptyGuest = false;
    let auth: Awaited<ReturnType<typeof getCartAuthContext>> = null;
    const finish = (response: NextResponse) => {
      if (connection?.token && (operation !== 'get' || !tokenFrom(request, cookieName))) response.cookies.set(cookieName, connection.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 48 * 60 * 60 });
      if (dropEmptyGuest) response.cookies.set(GUEST_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
      return response;
    };
    try {
      auth = await getCartAuthContext(request);
      const expectedIdentity = request.headers.get('X-NRH-Cart-Identity');
      if (expectedIdentity && expectedIdentity !== (auth?.userId || 'guest')) return json({ code: 'cart_session_changed', message: 'نشست تغییر کرده است. سبد را تازه‌سازی کنید.' }, 409);
      const guestToken = tokenFrom(request, GUEST_COOKIE);
      const userToken = auth ? tokenFrom(request, 'nrh_cart_user_' + auth.userId) : undefined;
      // Only GET bootstraps a cart. A write cannot create a competing anonymous session.
      if (operation !== 'get' && !guestToken && !userToken) return json({ code: 'cart_session_required', message: 'ابتدا سبد خرید را دریافت کنید.' }, 409);
      return await withCartLocks([
        ...(guestToken ? [cartTokenIdentity(guestToken)] : []),
        ...(userToken ? [cartTokenIdentity(userToken)] : []),
        ...(auth ? ['cart:' + auth.userId] : []),
      ], async () => {
        let cart: WooCommerceCart | undefined;
        if (auth && guestToken) {
          // Keep the guest cart until Boom's real merge contract is available.
          connection = new CartConnection(guestToken);
          cart = await connection.cart();
          pending = cart.items_count > 0;
          dropEmptyGuest = !pending;
        }
        if (!pending) {
          cookieName = auth ? 'nrh_cart_user_' + auth.userId : GUEST_COOKIE;
          connection = new CartConnection(tokenFrom(request, cookieName), auth?.headers);
          cart = await connection.cart();
        }
        if (!connection || !cart) throw new CartError(502, 'invalid_cart_response', 'دریافت سبد ممکن نشد.');
        if (operation === 'prepare-checkout') {
          if (pending) throw new CartError(409, 'cart_merge_required', 'سبد این دستگاه محفوظ است؛ برای ادامه خرید، همگام‌سازی با سبد حساب باید تکمیل شود.', cart);
          if (!cart.items_count || cart.errors.length) throw new CartError(409, 'cart_not_ready', 'ابتدا مشکلات سبد خرید را برطرف کنید.', cart);
          const checkout = await connection.send('/checkout') as { order_id?: number; status?: string };
          if (!checkout?.order_id) throw new CartError(502, 'invalid_checkout_response', 'آماده‌سازی تسویه‌حساب ممکن نشد.');
          return finish(json({ cart: { ...await connection.cart(), account_sync_pending: false }, checkout: { order_id: checkout.order_id, status: checkout.status } }));
        }
        if (operation === 'clear') { await connection.send('/cart/items', 'DELETE'); cart = await connection.cart(); }
        else if (operation !== 'get') {
          const data = await connection.send('/cart/' + operation, 'POST', input);
          if (!isCart(data)) throw new CartError(502, 'invalid_cart_response', 'پاسخ سبد خرید معتبر نیست.');
          cart = data;
        }
        return finish(json({ ...cart, account_sync_pending: pending }));
      });
    } catch (error) {
      if (error instanceof CartLockBusyError) return json({ code: 'cart_busy', message: error.message }, 409);
      if (error instanceof CartError) return finish(json({ code: error.code, message: error.message, ...(error.cart ? { data: { cart: { ...error.cart, account_sync_pending: pending } } } : {}) }, error.status));
      return finish(json({ code: 'cart_unavailable', message: 'دریافت سبد یا نشست حساب ممکن نشد. دوباره تلاش کنید.' }, 502));
    }
  };
}
export const getCartHandler = handler('get');
export const addItemHandler = handler('add-item', addItemSchema);
export const updateItemHandler = handler('update-item', updateItemSchema);
export const removeItemHandler = handler('remove-item', itemKeySchema);
export const clearCartHandler = handler('clear');
export const applyCouponHandler = handler('apply-coupon', couponSchema);
export const removeCouponHandler = handler('remove-coupon', couponSchema);
export const updateCustomerHandler = handler('update-customer', customerSchema);
export const shippingHandler = handler('select-shipping-rate', shippingSchema);
export const prepareCheckoutHandler = handler('prepare-checkout');
