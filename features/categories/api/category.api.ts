import 'server-only';
import { cache } from 'react';
import { getAllCategories } from './categories.api';
import { decodeSlug } from '@/lib/urls';

export const getSpecificCategory = cache(async (id: number) =>
  (await getAllCategories()).find(category => category.id === id) || null);

export const getCategoryBySlug = cache(async (slug: string) =>
  (await getAllCategories()).find(category => decodeSlug(category.slug) === decodeSlug(slug)) || null);
