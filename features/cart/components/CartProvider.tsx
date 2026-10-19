'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { CartDrawer } from './CartDrawer';
import { cartKeys } from '../api/cart.keys';
import { cartText } from '../utils/cart.utils';

type Notice = { message: string; tone: 'success' | 'error'; id: number };
const CartUIContext = createContext<{ open: boolean; notice: Notice | null; dismissNotice: () => void; openDrawer: () => void; closeDrawer: () => void; notify: (message: string, tone: Notice['tone']) => void } | null>(null);
export function useCartUI() {
  const value = useContext(CartUIContext);
  if (!value) throw new Error('CartProvider is required.');
  return value;
}
export function CartProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const client = useQueryClient();
  const notify = useCallback((message: string, tone: Notice['tone']) => setNotice({ message: cartText(message), tone, id: Date.now() }), []);
  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);
  const dismissNotice = useCallback(() => setNotice(null), []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('nrh-cart');
    channel.onmessage = () => { void client.invalidateQueries({ queryKey: cartKeys.all }); };
    return () => channel.close();
  }, [client]);
  return <CartUIContext.Provider value={{ open, notice, dismissNotice, openDrawer, closeDrawer, notify }}>
    {children}
    <CartDrawer />
    {notice && <div role={notice.tone === 'error' ? 'alert' : 'status'} data-testid="cart-toast" className={'fixed right-4 top-20 z-[80] max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-xl sm:right-6 sm:top-5 sm:max-w-md ' + (open ? 'hidden sm:flex' : 'flex')}>
      {notice.tone === 'success' ? <CheckCircle2 className="size-6 shrink-0 text-emerald-600" /> : <CircleAlert className="size-6 shrink-0 text-red-600" />}
      <p className="leading-7">{notice.message}</p>
      <button type="button" onClick={() => setNotice(null)} aria-label="بستن اعلان" className="rounded-lg p-2 hover:bg-gray-100"><X className="size-4" /></button>
    </div>}
  </CartUIContext.Provider>;
}
