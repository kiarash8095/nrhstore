import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { absoluteUrl } from '@/configs/site';
import { categoryPath, productPath } from '@/lib/urls';
import { getAllProducts } from '@/features/products/server';
import { getAllCategories } from '@/features/categories/server';
import { getAllBlogPosts, blogPostPath } from '@/features/blog/server';

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Generate from the live catalog at request time, not while deploying a build.
  // The WooCommerce transport still caches its public reads for 300 seconds.
  await connection();
  const [products, categories, posts] = await Promise.all([getAllProducts(), getAllCategories(), getAllBlogPosts()]);
  const paths = ['/', '/products', '/categories', '/contact-us', '/blog', '/privacy-policy',
    ...products.map(product => productPath(product.slug)),
    ...categories.filter(category => (category.count || 0) > 0).map(category => categoryPath(category.slug)),
    ...posts.map(post => blogPostPath(post.slug))];
  const blogDates = new Map(posts.map(post => [blogPostPath(post.slug), post.modifiedAt]));
  return [...new Set(paths)].map(path => ({ url: absoluteUrl(path), ...(blogDates.has(path) ? { lastModified: blogDates.get(path) } : {}) }));
}
