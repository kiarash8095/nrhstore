import { absoluteUrl, site } from '@/configs/site';
import { productPath } from '@/lib/urls';
import { plainText } from '@/lib/seo/text';
import type { Products } from '../types/product.types';

export function productStructuredData(product: Products) {
  const currency = product.prices.currency_code;
  const minorUnit = product.prices.currency_minor_unit;
  const amount = Number(product.prices.price);
  const validPrice = /^\d+$/.test(product.prices.price) && Number.isSafeInteger(amount) && amount > 0 &&
    typeof minorUnit === 'number' && Number.isInteger(minorUnit) && minorUnit >= 0 && minorUnit <= 6 && ['IRT', 'IRR'].includes(currency || '');
  const price = validPrice ? amount / (10 ** minorUnit) * (currency === 'IRT' ? 10 : 1) : null;
  const rating = Number(product.average_rating);
  return {
    '@context': 'https://schema.org', '@type': 'Product',
    '@id': `${absoluteUrl(productPath(product.slug))}#product`,
    name: plainText(product.name), description: plainText(product.description),
    image: product.images.map(image => image.src),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.brands?.[0]?.name ? { brand: { '@type': 'Brand', name: product.brands[0].name } } : {}),
    ...(price ? { offers: { '@type': 'Offer', url: absoluteUrl(productPath(product.slug)), priceCurrency: 'IRR', price,
      availability: product.is_in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: site.name, '@id': `${site.url}/#organization` } } } : {}),
    ...(product.review_count > 0 && rating > 0 && rating <= 5 ? { aggregateRating: {
      '@type': 'AggregateRating', ratingValue: rating, reviewCount: product.review_count, bestRating: 5,
    } } : {}),
  };
}
