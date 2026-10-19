import api from '@/lib/http/client';
import type { Category, SubCategory } from '../types/category.types';

export async function getMainCategories(ids: number[], slugs?: string[]) {
  const { data } = await api.get<Category[]>('/products/categories', { params: {
    parent: 0, include: ids.join(','), ...(slugs?.length ? { slug: slugs.join(',') } : {}), per_page: 100,
  } });
  return data;
}

export async function getSubCategories(id: number) {
  const { data } = await api.get<SubCategory[]>('/products/categories', { params: { parent: id, per_page: 100, hide_empty: false } });
  return data;
}
