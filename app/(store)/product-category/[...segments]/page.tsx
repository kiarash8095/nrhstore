import { notFound, permanentRedirect } from 'next/navigation';
import { getCategoryBySlug } from '@/features/categories/server';
import { categoryPath } from '@/lib/urls';

export default async function LegacyCategory({ params }: { params: Promise<{ segments: string[] }> }) {
  const segments = (await params).segments;
  const category = await getCategoryBySlug(segments[segments.length - 1]);
  if (!category) notFound();
  permanentRedirect(categoryPath(category.slug));
}
