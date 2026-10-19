import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/configs/site';
import { categoryPath, productPath } from '@/lib/urls';
import { getAllProducts } from '@/features/products/server';
import { getAllCategories } from '@/features/categories/server';

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getAllProducts(), getAllCategories()]);
  const paths = ['/', '/products', '/categories', '/contact-us',
    ...products.map(product => productPath(product.slug)),
    ...categories.filter(category => (category.count || 0) > 0).map(category => categoryPath(category.slug))];
  return [...new Set(paths)].map(path => ({ url: absoluteUrl(path) }));
}
