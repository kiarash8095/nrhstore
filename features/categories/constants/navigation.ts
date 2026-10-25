import { decodeSlug } from '@/lib/urls';
import type { Category } from '../types/category.types';

// IDs identify the existing store's categories even when their public slugs change.
// Aliases also support the old frontend URLs and stores with different IDs.
export const MAIN_CATEGORY_NAVIGATION = [
  { key: 'laptop', id: 55, slugs: ['laptop'] },
  { key: 'hardware', id: 365, slugs: ['computer-hardware', 'hardware'] },
  { key: 'edari', id: 57, slugs: ['printers-scanners', 'edari'] },
  { key: 'network', id: 58, slugs: ['network-equipment', 'network'] },
  { key: 'accessory', id: 59, slugs: ['accessories', 'accessory'] },
] as const;

const normalizedSlug = (slug: string) => decodeSlug(slug).toLowerCase();

export function getMainCategoryKey(category: Pick<Category, 'id' | 'slug'>) {
  return MAIN_CATEGORY_NAVIGATION.find(item => item.id === category.id)?.key ??
    MAIN_CATEGORY_NAVIGATION.find(item => item.slugs.some(slug => slug === normalizedSlug(category.slug)))?.key;
}

export function getHeaderCategories(categories: Category[]): Category[] {
  const roots = categories.filter(category => category.parent === 0);
  return MAIN_CATEGORY_NAVIGATION.flatMap(item => {
    const category = roots.find(category => category.id === item.id) ??
      roots.find(category => item.slugs.some(slug => slug === normalizedSlug(category.slug)));
    return category ? [category] : [];
  });
}

export function findCategoryBySlug(categories: Category[], slug: string): Category | null {
  const requested = normalizedSlug(slug);
  const exact = categories.find(category => normalizedSlug(category.slug) === requested);
  if (exact) return exact;
  const navigation = MAIN_CATEGORY_NAVIGATION.find(item => item.slugs.some(alias => alias === requested));
  return navigation ? getHeaderCategories(categories).find(category => getMainCategoryKey(category) === navigation.key) ?? null : null;
}
