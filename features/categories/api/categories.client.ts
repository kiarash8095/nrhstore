import api from '@/lib/http/client';
import type { Category, SubCategory } from '../types/category.types';

export async function getMainCategories(ids: number[], slugs?: string[], signal?: AbortSignal) {
  const { data } = await api.get<Category[]>('/products/categories', { params: {
    parent: 0, ...(ids.length ? { include: ids.join(',') } : slugs?.length ? { slug: slugs.join(',') } : {}), per_page: 100,
  }, signal });
  if (!Array.isArray(data)) throw new Error('Invalid category response.');
  return data;
}

export async function getSubCategories(id: number, signal?: AbortSignal) {
  const { data } = await api.get<SubCategory[]>('/products/categories', { params: { parent: id, per_page: 100, hide_empty: false }, signal });
  if (!Array.isArray(data)) throw new Error('Invalid category response.');
  return data;
}
