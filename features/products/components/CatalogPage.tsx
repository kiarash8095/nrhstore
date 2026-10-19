import { notFound } from 'next/navigation';
import { getProductCollection } from '../api/products.api';
import { ProductCard } from './ProductCard';
import { Pagination } from '@/components/common/Pagination';
import { parsePage } from '@/lib/urls';

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const page = parsePage((await searchParams).page);
  if (!page) notFound();
  const collection = await getProductCollection(page);
  if (page > collection.totalPages) notFound();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">فروشگاه نوین رایانه همدان</h1>
      <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-4">
        {collection.items.map(product => <ProductCard key={product.id} product={product} />)}
      </div>
      {collection.items.length === 0 && <p>در حال حاضر محصولی برای نمایش وجود ندارد.</p>}
      <Pagination path="/products" page={page} totalPages={collection.totalPages} />
    </main>
  );
}
