import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AuthBackendError, getCartAuthContext } from '@/features/auth/server';
import { getStoreApiUrl, getWordPressApiUrl } from '@/lib/wordpress/config';
import { consumeRateLimit } from '@/lib/server/rate-limit';
import { ConfigurationError } from '@/lib/server/runtime-config.cjs';
import { addItemSchema, updateItemSchema, itemKeySchema, couponSchema, customerSchema, shippingSchema, checkoutSchema, type CheckoutInput } from '../contracts';
import { allowedPaymentRedirect, checkoutSnapshot } from '../utils/checkout';
import { boundedJson } from '@/lib/http/bounded-json';
import { getTrustedRequestOrigin, isTrustedOriginRequest } from '@/lib/http/request-origin';
import { HeadlessBridgeError, requireHeadlessCapability } from '@/lib/wordpress/headless-bridge';
import type { WooCommerceCart } from '../types/woocommerce.types';
import { cartTokenIdentity, CartLockBusyError, withCartLocks } from './cart-lock';

const GUEST_COOKIE = 'nrh_cart_guest';
const tokenPattern = /^[a-zA-Z0-9_.-]{20,3800}$/;
const emptySchema = z.object({}).strict();
const checkoutDetailsSchema = z.object({
  version: z.literal(2),
  methods: z.array(z.object({ id: z.enum(['melli_pay', 'bacs']), title: z.string().max(150), description: z.string().max(1500) }).strict()).max(2),
  cashback: z.string().regex(/^[0-9]{1,18}$/).nullable(),
}).strict();
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' } });
}
class CartError extends Error {
  constructor(public status: number, public code: string, message: string, public cart?: WooCommerceCart) { super(message); }
}
function isCart(value: unknown): value is WooCommerceCart {
  if (!value || typeof value !== 'object') return false;
  const cart = value as WooCommerceCart;
  return Array.isArray(cart.items) && Array.isArray(cart.coupons) && !!cart.totals && typeof cart.totals.total_price === 'string' && typeof cart.items_count === 'number' &&
    (cart.nrh_checkout === undefined || checkoutDetailsSchema.safeParse(cart.nrh_checkout).success);
}
function readableMessage(value: unknown) {
  return typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/&[^;]{1,12};/g, ' ').slice(0, 350) : 'انجام درخواست سبد خرید ممکن نشد.';
}
function tokenFrom(request: NextRequest, name: string) {
  const value = request.cookies.get(name)?.value;
  return value && tokenPattern.test(value) ? value : undefined;
}

class CartConnection {
  private nonce?: string;
  private responseUser: string | null = null;
  constructor(public token?: string, private headers: Record<string, string> = {}, private userId?: string) {}
  get account() { return Boolean(this.headers.Cookie && this.headers['X-WP-Nonce']); }
  async send(path: string, method = 'GET', body?: unknown, bridge = false): Promise<unknown> {
    let response: Response;
    try {
      const url = new URL((bridge ? getWordPressApiUrl() + '/nrh/v1' : getStoreApiUrl()) + path);
      // The live LiteSpeed cache serves stale /cart responses even with no-store.
      // A unique GET URL also keeps initial anonymous Cart-Tokens isolated.
      if (method === 'GET') url.searchParams.set('_nrh_request', randomUUID());
      response = await fetch(url, {
        method, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(bridge ? 25000 : 15000),
        // Account requests use Woo's native cookie session, which Boom supports.
        // Sending Cart-Token here would select the incompatible token session handler.
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache', Origin: url.origin, 'X-NRH-Cart-Lock': 'mysql-v1', ...this.headers, ...(this.account ? (this.nonce ? { Nonce: this.nonce } : {}) : this.token ? { 'Cart-Token': this.token } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch { throw new CartError(502, 'cart_connection_failed', 'ارتباط با فروشگاه قطع شد. پیش از تلاش دوباره، سبد را تازه‌سازی کنید.'); }
    if (/hit/i.test([response.headers.get('X-LiteSpeed-Cache'), response.headers.get('CF-Cache-Status')].join(' '))) {
      throw new CartError(502, 'cart_cache_misconfigured', 'دریافت نسخه به‌روز سبد ممکن نشد. لطفاً کمی بعد دوباره تلاش کنید.');
    }
    const token = response.headers.get('Cart-Token');
    if (!this.account && token && tokenPattern.test(token)) this.token = token;
    const nonce = response.headers.get('Nonce');
    if (nonce && /^[a-zA-Z0-9]{10}$/.test(nonce)) this.nonce = nonce;
    this.responseUser = response.headers.get('User-ID');
    const data = response.status === 204 ? null : await boundedJson(response, bridge ? 16384 : 2 * 1024 * 1024).catch(() => null);
    if (!response.ok) {
      const detail = data && typeof data === 'object' ? data as Record<string, unknown> : {};
      const extra = detail.data && typeof detail.data === 'object' ? detail.data as Record<string, unknown> : {};
      throw new CartError(response.status >= 500 ? 502 : response.status,
        typeof detail.code === 'string' ? detail.code : 'cart_request_failed',
        response.status >= 500 ? 'فروشگاه موقتاً در دسترس نیست. دوباره تلاش کنید.' : readableMessage(detail.message),
        isCart(extra.cart) ? extra.cart : undefined);
    }
    // Every write is preceded by cart(), so an old/missing plugin is rejected
    // on the read, before a mutation can be sent without shared serialization.
    if (!bridge && response.headers.get('X-NRH-Cart-Lock') !== 'mysql-v1') {
      throw new CartError(503, 'cart_lock_backend_missing', 'افزونهٔ هماهنگ‌سازی سبد فروشگاه باید به‌روزرسانی شود. لطفاً با پشتیبانی تماس بگیرید.');
    }
    if (data === null && response.status !== 204) throw new CartError(502, 'invalid_cart_response', 'پاسخ فروشگاه معتبر نیست.');
    return data;
  }
  async cart(): Promise<WooCommerceCart> {
    const data = await this.send('/cart');
    if (!isCart(data) || (this.account ? !this.nonce || this.responseUser !== this.userId : !this.token)) throw new CartError(502, 'invalid_cart_response', 'دریافت نشست معتبر سبد ممکن نشد.');
    return data;
  }
}

type Operation = 'get' | 'sync' | 'add-item' | 'update-item' | 'remove-item' | 'clear' | 'apply-coupon' | 'remove-coupon' | 'update-customer' | 'select-shipping-rate' | 'pay';
function handler(operation: Operation, schema: z.ZodType = emptySchema) {
  return async (request: NextRequest) => {
    if (!isTrustedOriginRequest(request)) {
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
      if (!connection?.account && connection?.token && (operation !== 'get' || !tokenFrom(request, cookieName))) response.cookies.set(cookieName, connection.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 48 * 60 * 60 });
      if (dropEmptyGuest) response.cookies.set(GUEST_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
      return response;
    };
    try {
      auth = await getCartAuthContext(request);
      if (['pay', 'sync'].includes(operation) && !auth) return json({ code: 'login_required', message: 'برای تسویه وارد حساب شوید.' }, 401);
      if (operation === 'pay') {
        if (!auth) return json({ code: 'login_required', message: 'برای پرداخت وارد حساب شوید.' }, 401);
        if (!consumeRateLimit('payment:' + auth.userId, 8, 60_000).allowed) return json({ code: 'payment_rate_limited', message: 'کمی صبر کنید و وضعیت سفارش قبلی را بررسی کنید.' }, 429);
      }
      const expectedIdentity = request.headers.get('X-NRH-Cart-Identity');
      if (expectedIdentity && expectedIdentity !== (auth?.userId || 'guest')) return json({ code: 'cart_session_changed', message: 'نشست تغییر کرده است. سبد را تازه‌سازی کنید.' }, 409);
      const guestToken = tokenFrom(request, GUEST_COOKIE);
      const userToken = auth ? tokenFrom(request, 'nrh_cart_user_' + auth.userId) : undefined;
      // Only GET bootstraps a cart. A write cannot create a competing anonymous session.
      if (operation !== 'get' && !auth && !guestToken) return json({ code: 'cart_session_required', message: 'ابتدا سبد خرید را دریافت کنید.' }, 409);
      return await withCartLocks([
        ...(guestToken ? [cartTokenIdentity(guestToken)] : []),
        ...(userToken ? [cartTokenIdentity(userToken)] : []),
        ...(auth ? ['cart:' + auth.userId] : []),
      ], async () => {
        let cart: WooCommerceCart | undefined;
        if (auth && guestToken) {
          // Reads preserve the guest cart; the explicit sync POST transfers it.
          connection = new CartConnection(guestToken);
          cart = await connection.cart();
          pending = cart.items_count > 0;
          dropEmptyGuest = !pending;
        }
        if (!pending) {
          cookieName = auth ? 'nrh_cart_user_' + auth.userId : GUEST_COOKIE;
          connection = new CartConnection(auth ? undefined : tokenFrom(request, cookieName), auth?.headers, auth?.userId);
          cart = await connection.cart();
        }
        if (!connection || !cart) throw new CartError(502, 'invalid_cart_response', 'دریافت سبد ممکن نشد.');
        if (operation === 'sync') {
          if (pending && auth && guestToken) {
            const account = new CartConnection(undefined, auth.headers, auth.userId);
            try {
              await requireHeadlessCapability(auth.headers, 'cart_merge');
              const synced = await account.send('/cart/merge', 'POST', { guest_token: guestToken, merge_policy: 'sum-v1' }, true) as { merged?: boolean };
              if (synced?.merged !== true) throw new CartError(502, 'invalid_merge_response', 'تأیید انتقال سبد دریافت نشد. دوباره سبد را بررسی کنید.');
              // Drop the guest cookie only after the account cart can be read back.
              const merged = await account.cart();
              connection = account; cart = merged; pending = false; dropEmptyGuest = true;
            } catch (error) {
              if (error instanceof HeadlessBridgeError) throw new CartError(error.status, error.code, error.message, cart);
              if (error instanceof CartError) throw new CartError(error.status, error.code === 'rest_no_route' ? 'cart_bridge_missing' : error.code,
                error.code === 'rest_no_route' ? 'سرویس انتقال سبد روی فروشگاه فعال نیست. سبد شما محفوظ است؛ با پشتیبانی تماس بگیرید.' : error.message, cart);
              throw error;
            }
          }
          return finish(json({ ...cart, account_sync_pending: pending }));
        }
        if (operation === 'pay') {
          if (!auth) throw new CartError(401, 'login_required', 'برای ثبت سفارش وارد حساب شوید.');
          const value = input as CheckoutInput;
          if (pending) throw new CartError(409, 'cart_merge_required', 'سبد این دستگاه محفوظ است؛ همگام‌سازی با حساب باید تکمیل شود.', cart);
          if (!cart.items_count || cart.errors.length || !cart.needs_payment || !cart.payment_methods?.includes(value.payment_method) ||
              (cart.needs_shipping && (!cart.shipping_rates.length || cart.shipping_rates.some(pack => !pack.shipping_rates?.some(rate => rate.selected))))) {
            throw new CartError(409, 'cart_not_ready', 'آدرس، روش ارسال و درگاه پرداخت سبد را بررسی کنید.', cart);
          }
          if (value.expected_total !== cart.totals.total_price || value.cart_hash !== createHash('sha256').update(checkoutSnapshot(cart)).digest('hex')) {
            throw new CartError(409, 'cart_changed', 'سبد یا مبلغ تغییر کرده است. اطلاعات تازه را بررسی و دوباره تأیید کنید.', cart);
          }
          const extended = value.payment_method === 'bacs' || value.customer_note !== '';
          if (extended) await requireHeadlessCapability(auth.headers, 'checkout');
          const { payment_method, customer_note, ...snapshot } = value;
          const parsed = z.object({ order_id: z.number().int().positive().safe(), redirect_url: z.string().max(2048) }).strict().safeParse(
            await connection.send('/checkout', 'POST', { ...snapshot, ...(extended ? { payment_method, customer_note } : {}), billing_address: cart.billing_address, shipping_address: cart.shipping_address }, true),
          );
          const frontendOrigin = getTrustedRequestOrigin(request);
          if (!parsed.success || !allowedPaymentRedirect(parsed.data.redirect_url, frontendOrigin, parsed.data.order_id)) {
            throw new CartError(502, 'invalid_payment_response', 'پاسخ پرداخت معتبر نیست. پیش از تلاش دوباره وضعیت سفارش را بررسی کنید.');
          }
          if (value.payment_method === 'bacs' && new URL(parsed.data.redirect_url).origin !== frontendOrigin) {
            throw new CartError(502, 'invalid_payment_response', 'پاسخ ثبت سفارش معتبر نیست. وضعیت سفارش را بررسی کنید.');
          }
          return finish(json(parsed.data));
        }
        if (operation === 'clear') { await connection.send('/cart/items', 'DELETE'); cart = await connection.cart(); }
        else if (operation !== 'get') {
          const data = await connection.send('/cart/' + operation, 'POST', input);
          if (!isCart(data)) throw new CartError(502, 'invalid_cart_response', 'پاسخ سبد خرید معتبر نیست.');
          cart = data;
        }
        return finish(json({ ...cart, account_sync_pending: pending }));
      }, { upstream: true });
    } catch (error) {
      if (error instanceof ConfigurationError) {
        console.error('[cart] Configuration error:', error.message);
        return json({ code: 'configuration_error', message: 'تنظیمات سرویس فروشگاه کامل نیست. لطفاً با پشتیبانی تماس بگیرید.' }, 503);
      }
      if (error instanceof CartLockBusyError) return json({ code: 'cart_busy', message: error.message }, 409);
      if (error instanceof HeadlessBridgeError) return finish(json({ code: error.code, message: error.message }, error.status));
      if (error instanceof AuthBackendError) return json({ code: error.code, message: error.message }, error.status);
      if (error instanceof CartError) return finish(json({ code: error.code, message: error.message, ...(error.cart ? { data: { cart: { ...error.cart, account_sync_pending: pending } } } : {}) }, error.status));
      console.error('[cart] Unexpected failure:', error instanceof Error ? error.name : 'UnknownError');
      return finish(json({ code: 'cart_unavailable', message: 'دریافت سبد یا نشست حساب ممکن نشد. دوباره تلاش کنید.' }, 502));
    }
  };
}
export const getCartHandler = handler('get');
export const syncCartHandler = handler('sync');
export const addItemHandler = handler('add-item', addItemSchema);
export const updateItemHandler = handler('update-item', updateItemSchema);
export const removeItemHandler = handler('remove-item', itemKeySchema);
export const clearCartHandler = handler('clear');
export const applyCouponHandler = handler('apply-coupon', couponSchema);
export const removeCouponHandler = handler('remove-coupon', couponSchema);
export const updateCustomerHandler = handler('update-customer', customerSchema);
export const shippingHandler = handler('select-shipping-rate', shippingSchema);
export const payHandler = handler('pay', checkoutSchema);
