'use client';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth, getAuthIdentity } from '@/features/auth';
import { useHydrated } from '@/hooks/use-hydrated';
import * as api from '../api/cart.api';
import { cartKeys } from '../api/cart.keys';
import type { AddCartItemInput, CustomerInput, ShippingInput, WooCommerceCart } from '../contracts';
import { useCartUI } from '../components/CartProvider';

type CartAction =
  | { kind: 'add'; item: AddCartItemInput }
  | { kind: 'update'; key: string; quantity: number; previousQuantity?: number }
  | { kind: 'remove'; key: string }
  | { kind: 'clear' }
  | { kind: 'apply-coupon' | 'remove-coupon'; code: string }
  | { kind: 'customer'; data: CustomerInput }
  | { kind: 'shipping'; data: ShippingInput };
type Action = CartAction & { identity: string };

export function useCart() {
  const hydrated = useHydrated();
  const { status, user } = useAuth();
  const identity = status === 'authenticated' ? user?.id || 'guest' : 'guest';
  const queryKey = cartKeys.session(identity);
  const client = useQueryClient();
  const ui = useCartUI();
  const busy = useIsMutating({ mutationKey: cartKeys.mutations }) > 0;
  const query = useQuery({
    queryKey, queryFn: ({ signal }) => api.getCart(signal), enabled: hydrated && status !== 'unknown' && !busy,
    staleTime: 15_000, gcTime: 5 * 60_000, retry: false, refetchOnWindowFocus: 'always',
  });
  const mutation = useMutation({
    mutationKey: cartKeys.mutations, scope: { id: 'cart-writes' }, retry: false,
    mutationFn: async (action: Action) => {
      // Cancel older reads before writing; only WooCommerce responses update the cache.
      await client.cancelQueries({ queryKey: cartKeys.session(action.identity) });
      if (getAuthIdentity() !== action.identity) throw new api.CartClientError('نشست تغییر کرده است. سبد را تازه‌سازی کنید.', 'cart_session_changed', 409);
      switch (action.kind) {
        case 'add': return api.addCartItem(action.item);
        case 'update': return api.updateCartItem(action.key, action.quantity, action.previousQuantity);
        case 'remove': return api.removeCartItem(action.key);
        case 'clear': return api.clearCart();
        case 'apply-coupon': return api.applyCoupon(action.code);
        case 'remove-coupon': return api.removeCoupon(action.code);
        case 'customer': return api.updateCustomer(action.data);
        case 'shipping': return api.selectShipping(action.data);
      }
    },
    onSuccess: (cart, action) => {
      if (getAuthIdentity() !== action.identity) return;
      client.setQueryData<WooCommerceCart>(cartKeys.session(action.identity), cart);
      if (action.kind === 'add') {
        const item = cart.items.find(item => item.id === action.item.id);
        ui.notify(item ? item.name + ' به سبد خرید اضافه شد.' : 'سبد خرید به‌روز شد.', 'success');
        ui.openDrawer();
      } else if (action.kind === 'remove') ui.notify('محصول از سبد خرید حذف شد.', 'success');
      else if (action.kind === 'apply-coupon') ui.notify('کد تخفیف اعمال شد.', 'success');
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('nrh-cart'); channel.postMessage('changed'); channel.close();
      }
    },
    onError: (error, action) => {
      if (getAuthIdentity() !== action.identity) return;
      if (error instanceof api.CartClientError && error.cart) client.setQueryData(queryKey, error.cart);
      else void client.invalidateQueries({ queryKey });
      ui.notify(error.message, 'error');
    },
  });
  const mutate = (action: CartAction) => mutation.mutateAsync({ ...action, identity });
  return {
    queryKey,
    cart: hydrated ? query.data ?? (query.error instanceof api.CartClientError ? query.error.cart : undefined) : undefined,
    error: query.error, isLoading: !hydrated || status === 'unknown' || query.isPending,
    isSessionReady: hydrated && status !== 'unknown',
    isFetching: query.isFetching, busy, refetch: query.refetch,
    addItem: (item: AddCartItemInput) => mutate({ kind: 'add', item }),
    updateItem: (key: string, quantity: number) => mutate({ kind: 'update', key, quantity, previousQuantity: query.data?.items.find(item => item.key === key)?.quantity }),
    removeItem: (key: string) => mutate({ kind: 'remove', key }),
    clear: () => mutate({ kind: 'clear' }),
    applyCoupon: (code: string) => mutate({ kind: 'apply-coupon', code }),
    removeCoupon: (code: string) => mutate({ kind: 'remove-coupon', code }),
    updateCustomer: (data: CustomerInput) => mutate({ kind: 'customer', data }),
    selectShipping: (data: ShippingInput) => mutate({ kind: 'shipping', data }),
  };
}
