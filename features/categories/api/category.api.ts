import 'server-only';
import { cache } from 'react';
import { getAllCategories } from './categories.api';
import { findCategoryBySlug } from '../constants/navigation';

export const getSpecificCategory = cache(async (id: number) =>
  (await getAllCategories()).find(category => category.id === id) || null);

export const getCategoryBySlug = cache(async (slug: string) =>
  findCategoryBySlug(await getAllCategories(), slug));
