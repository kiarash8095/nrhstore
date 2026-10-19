import type { Metadata } from 'next';
import { pagePath, parsePage } from '@/lib/urls';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }): Promise<Metadata> {
  const page = parsePage((await searchParams).page) || 1;
  return { title: 'فروشگاه', description: 'مشاهده و خرید محصولات نوین رایانه همدان.', alternates: { canonical: pagePath('/products', page) } };
}

export { CatalogPage as default } from '@/features/products/server';
