'use client';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../hooks/use-cart';
import { useCartUI } from './CartProvider';
export function CartButton() {
  const { cart } = useCart();
  const { openDrawer } = useCartUI();
  return <button type="button" onClick={openDrawer} aria-label={'سبد خرید، ' + (cart?.items_count ?? 0) + ' کالا'} className="relative flex size-11 items-center justify-center rounded-full border border-gray-200 bg-white transition hover:border-orange-500">
    <ShoppingBag className="size-5" />
    {!!cart?.items_count && <span data-testid="cart-count" className="absolute -right-1 -top-1 min-w-5 rounded-full bg-orange-600 px-1 text-center text-xs leading-5 text-white">{cart.items_count.toLocaleString('fa-IR')}</span>}
  </button>;
}

