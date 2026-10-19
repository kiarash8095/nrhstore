import 'server-only';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { site, absoluteUrl } from '@/configs/site';
import { productPath } from '@/lib/urls';
import { description, plainText } from '@/lib/seo/text';
import { getProductDetails } from '../api/products.api';

export async function generateProductMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProductDetails((await params).slug);
  if (!product) notFound();
  const title = plainText(product.name);
  const summary = description(product.description, `مشخصات و خرید ${title} از ${site.name}.`);
  const images = product.images.map(image => ({ url: image.src, alt: title }));
  return { title, description: summary, alternates: { canonical: productPath(product.slug) },
    openGraph: { type: 'website', title, description: summary, url: absoluteUrl(productPath(product.slug)), images },
    twitter: { card: 'summary_large_image', title, description: summary, images: images.map(image => image.url) },
  };
}
