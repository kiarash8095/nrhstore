export function decodeSlug(value: string) {
  try { return decodeURIComponent(value).normalize('NFC'); }
  catch { return value.normalize('NFC'); }
}

export function productPath(slug: string) {
  return `/products/${encodeURIComponent(decodeSlug(slug))}`;
}

export function categoryPath(slug: string) {
  return `/products/category/${encodeURIComponent(decodeSlug(slug))}`;
}

export function pagePath(path: string, page: number) {
  return page > 1 ? `${path}?page=${page}` : path;
}

export function parsePage(value: string | string[] | undefined): number | null {
  if (value === undefined) return 1;
  if (typeof value !== 'string' || !/^[1-9]\d{0,5}$/.test(value)) return null;
  return Number(value);
}
