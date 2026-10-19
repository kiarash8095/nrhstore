import { wcFetch } from '@/lib/woocommerce/store-client';
import type { Products } from '../types/product.types';
import { ProductCard } from './ProductCard';

export async function RelatedProducts({ product }: { product: Products }) {
  const products = await wcFetch<Products[]>(`/products?related=${product.id}&per_page=6`).catch(() => []);
  const related = products.filter(item => item.id !== product.id);
  if (!related.length) return null;
  return <section className="mx-auto my-10 w-[95%] max-w-7xl">
    <h2 className="mb-5 text-xl font-bold">محصولات مرتبط</h2>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{related.map(item => <ProductCard key={item.id} product={item} />)}</div>
  </section>;
}
