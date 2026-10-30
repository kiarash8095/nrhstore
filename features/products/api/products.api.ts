import 'server-only';
import { cache } from 'react';
import type { ProductCardData, Products } from '../types/product.types';
import { PRODUCT_CARD_FIELDS } from '../constants/catalog';
import { wcFetch, wcResponse } from '@/lib/woocommerce/store-client';
import { WooCommerceApiError } from '@/lib/woocommerce/api-error';
import { decodeSlug } from '@/lib/urls';

async function productCollection<T>(page: number, categoryId: number | undefined, perPage: number, fields?: string) {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (categoryId) params.set('category', String(categoryId));
  if (fields) params.set('_fields', fields);
  const response = await wcResponse(`/products?${params}`);
  const items = await response.json() as T[];
  if (!Array.isArray(items)) throw new WooCommerceApiError(502, 'invalid_response');
  return {
    items,
    total: Number(response.headers.get('X-WP-Total') || items.length),
    totalPages: Number(response.headers.get('X-WP-TotalPages') || 1),
    page,
  };
}

export function getProductCollection(page = 1, categoryId?: number, perPage = 20) {
  return productCollection<Products>(page, categoryId, perPage);
}

export function getProductCardCollection(page = 1, categoryId?: number, perPage = 20) {
  return productCollection<ProductCardData>(page, categoryId, perPage, PRODUCT_CARD_FIELDS);
}

export const getProducts = async () => (await getProductCollection()).items;

export const getProductVariations = (id: number) => wcFetch<Products[]>(`/products?type=variation&parent=${id}&per_page=100`);

export const getProductDetails = cache(async (slug: string): Promise<Products | null> => {
  if (!slug || /[\/\\?#\u0000-\u001f]/.test(decodeSlug(slug))) return null;
  try {
    const product = await wcFetch<Products>(`/products/${encodeURIComponent(decodeSlug(slug))}`);
    if (!product || !Number.isSafeInteger(product.id) || !product.slug) throw new WooCommerceApiError(502, 'invalid_response');
    return product;
  } catch (error) {
    if (error instanceof WooCommerceApiError && error.status === 404) return null;
    throw error;
  }
});

export async function getAllProducts() {
  const first = await getProductCollection(1, undefined, 100);
  const products = [...first.items];
  for (let page = 2; page <= first.totalPages; page++) products.push(...(await getProductCollection(page, undefined, 100)).items);
  return products;
}
