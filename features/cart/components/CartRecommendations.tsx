'use client';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import type { Products } from '@/features/products';
import { productPath } from '@/lib/urls';
import type { WooCommerceCart } from '../contracts';
import { cartText, money } from '../utils/cart.utils';
export function CartRecommendations({ cart }: { cart: WooCommerceCart }) {
  const ids = [...new Set(cart.items.map(item => item.id))].slice(0, 8).join(',');
  const { data = [] } = useQuery({
    queryKey: ['cart-recommendations', ids], enabled: !!ids, staleTime: 5 * 60_000, retry: false,
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/cart/recommendations?ids=' + ids, { signal });
      return response.ok ? await response.json() as Products[] : [];
    },
  });
  const products = data.filter(product => !cart.items.some(item => item.id === product.id || item.id === product.parent));
  if (!products.length) return null;
  return <section>
    <h2 className="mb-2 text-lg font-bold">شاید این‌ها را هم بپسندید</h2><p className="mb-5 text-sm text-gray-500">پیشنهادهایی مرتبط با کالاهای سبد شما</p>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{products.map(product => <Link key={product.id} href={productPath(product.slug)} className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-3 transition hover:border-orange-300 hover:shadow-md">
      <div className="relative mb-3 aspect-square">{product.images[0]?.src && <Image fill sizes="(max-width: 768px) 45vw, 180px" src={product.images[0].src} alt={cartText(product.name)} className="object-contain p-2 transition group-hover:scale-105" />}</div>
      <h3 className="mb-4 line-clamp-2 min-h-12 text-xs leading-6">{cartText(product.name)}</h3>
      <p className="mt-auto text-left text-xs font-bold">{money(product.prices.price, product.prices)}</p>
    </Link>)}</div>
  </section>;
}
