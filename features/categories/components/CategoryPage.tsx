import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getCategoryBySlug } from '../api/category.api';
import { getAllCategories } from '../api/categories.api';
import { getProductCardCollection } from '@/features/products/server';
import { ProductCard } from '@/features/products';
import { Pagination } from '@/components/common/Pagination';
import { JsonLd } from '@/components/common/JsonLd';
import { categoryPath, decodeSlug, pagePath, parsePage } from '@/lib/urls';
import { absoluteUrl } from '@/configs/site';
import { e2p } from '@/utils/numbers';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const requestedSlug = (await params).slug;
  const category = await getCategoryBySlug(requestedSlug);
  const page = parsePage((await searchParams).page);
  if (!category || !page) notFound();
  if (decodeSlug(category.slug) !== decodeSlug(requestedSlug)) {
    permanentRedirect(pagePath(categoryPath(category.slug), page));
  }
  const [collection, categories] = await Promise.all([getProductCardCollection(page, category.id), getAllCategories()]);
  if (page > collection.totalPages) notFound();
  const path = categoryPath(category.slug);
  const children = categories.filter(item => item.parent === category.id);
  const ancestors = [];
  const seen = new Set<number>([category.id]);
  let parent = categories.find(item => item.id === category.parent);
  while (parent && !seen.has(parent.id)) {
    seen.add(parent.id);
    ancestors.unshift(parent);
    const parentId = parent.parent;
    parent = categories.find(item => item.id === parentId);
  }
  const crumbs = [
    { name: 'خانه', path: '/' }, { name: 'محصولات', path: '/products' },
    ...ancestors.map(item => ({ name: item.name, path: categoryPath(item.slug) })),
    { name: category.name, path: pagePath(path, page) },
  ];
  return <main className="container mx-auto px-4 py-8">
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteUrl(item.path) })) }} />
    <nav aria-label="مسیر راهنما" className="mb-6 flex flex-wrap gap-2 text-sm text-gray-500">
      {crumbs.map((item, index) => <span key={item.path}>
        {index > 0 && <span aria-hidden="true"> / </span>}
        {index === crumbs.length - 1 ? <span aria-current="page">{item.name}</span> : <Link href={item.path}>{item.name}</Link>}
      </span>)}
    </nav>
    <h1 className="mb-3 text-2xl font-bold">{category.name}</h1>
    <p className="mb-6 text-sm text-gray-500">{e2p(collection.total)} محصول</p>
    {children.length > 0 && <nav aria-label="زیردسته‌ها" className="mb-6 flex flex-wrap gap-3">
      {children.map(item => <Link key={item.id} href={categoryPath(item.slug)} className="rounded-full border px-4 py-2 text-sm">{item.name}</Link>)}
    </nav>}
    <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-4">
      {collection.items.map(product => <ProductCard key={product.id} product={product} />)}
    </div>
    {collection.items.length === 0 && <p className="py-12 text-center">در حال حاضر محصولی در این دسته وجود ندارد.</p>}
    <Pagination path={path} page={page} totalPages={collection.totalPages} />
  </main>;
}
