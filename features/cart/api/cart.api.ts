import type { AddCartItemInput, CustomerInput, ShippingInput, WooCommerceCart } from '../contracts';
import { withStoreSessionLock } from '@/lib/http/store-session-lock';
import { getAuthIdentity } from '@/features/auth';
export class CartClientError extends Error {
  constructor(message: string, public code: string, public status: number, public cart?: WooCommerceCart) { super(message); }
}
async function requestUnlocked<T>(path: string, body: unknown, signal: AbortSignal | undefined, identity: string): Promise<T> {
  if (getAuthIdentity() !== identity) throw new CartClientError('نشست تغییر کرده است. سبد را تازه‌سازی کنید.', 'cart_session_changed', 409);
  let response: Response;
  try {
    response = await fetch('/api/cart' + path, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', signal,
      headers: { 'X-NRH-Cart-Identity': identity, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new CartClientError('ارتباط قطع شد. سبد را تازه‌سازی کنید و نتیجه را بررسی کنید.', 'network_error', 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new CartClientError(data?.message || 'انجام درخواست ممکن نشد.', data?.code || 'invalid_response', response.status, data?.data?.cart);
  return data as T;
}
function request<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const identity = getAuthIdentity();
  return withStoreSessionLock(() => body === undefined ? requestUnlocked<T>(path, body, signal, identity) : writeUnlocked<T>(path, body, identity), signal);
}
async function writeUnlocked<T>(path: string, body: unknown, identity: string): Promise<T> {
  try { return await requestUnlocked<T>(path, body, undefined, identity); }
  catch (error) {
    // This explicit rejection happens before any write. Lost responses are NEVER retried.
    if (!(error instanceof CartClientError) || error.code !== 'cart_session_required') throw error;
    await requestUnlocked<WooCommerceCart>('', undefined, undefined, identity);
    return requestUnlocked<T>(path, body, undefined, identity);
  }
}
export const getCart = (signal?: AbortSignal) => request<WooCommerceCart>('', undefined, signal);
export const addCartItem = (item: AddCartItemInput) => request<WooCommerceCart>('/add-item', item);
export function updateCartItem(key: string, quantity: number, previousQuantity?: number) {
  if (previousQuantity === undefined) return request<WooCommerceCart>('/update-item', { key, quantity });
  const identity = getAuthIdentity();
  return withStoreSessionLock(async () => {
    // Keep the user's +/- intent when another tab changes the same item before this turn.
    const latest = await requestUnlocked<WooCommerceCart>('', undefined, undefined, identity);
    const item = latest.items.find(item => item.key === key);
    if (!item) throw new CartClientError('این کالا دیگر در سبد نیست. سبد به‌روز شد.', 'cart_item_missing', 409, latest);
    return writeUnlocked<WooCommerceCart>('/update-item', { key, quantity: item.quantity + quantity - previousQuantity }, identity);
  });
}
export const removeCartItem = (key: string) => request<WooCommerceCart>('/remove-item', { key });
export const clearCart = () => request<WooCommerceCart>('/clear', {});
export const applyCoupon = (code: string) => request<WooCommerceCart>('/apply-coupon', { code });
export const removeCoupon = (code: string) => request<WooCommerceCart>('/remove-coupon', { code });
export const updateCustomer = (data: CustomerInput) => request<WooCommerceCart>('/update-customer', data);
export const selectShipping = (data: ShippingInput) => request<WooCommerceCart>('/select-shipping-rate', data);
export const prepareCheckout = () => request<{ cart: WooCommerceCart; checkout: { order_id: number; status: string } }>('/checkout', {});
