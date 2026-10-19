import 'server-only';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { categoryPath, pagePath, parsePage } from '@/lib/urls';
import { plainText } from '@/lib/seo/text';
import { getCategoryBySlug } from '../api/category.api';

export async function generateCategoryMetadata({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string | string[] }>;
}): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).slug);
  const page = parsePage((await searchParams).page);
  if (!category || !page) notFound();
  const title = `خرید ${plainText(category.name)}`;
  const summary = `مشاهده قیمت و مشخصات ${plainText(category.name)} در نوین رایانه همدان.`;
  return { title, description: summary, alternates: { canonical: pagePath(categoryPath(category.slug), page) },
    openGraph: { title, description: summary, ...(category.image?.src ? { images: [{ url: category.image.src, alt: category.name }] } : {}) },
    ...(category.count === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}
