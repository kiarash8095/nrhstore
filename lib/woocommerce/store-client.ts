import 'server-only';

import { getStoreApiUrl } from '@/lib/wordpress/config';
import { WooCommerceApiError } from './api-error';

export async function wcResponse(endpoint: string, options: RequestInit = {}) {
  if (!endpoint.startsWith('/') || endpoint.startsWith('//')) throw new Error('Invalid Store API endpoint.');
  try {
    const response = await fetch(`${getStoreApiUrl()}${endpoint}`, {
      ...options,
      headers: { Accept: 'application/json', ...options.headers },
      redirect: 'error',
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
      ...(options.cache === 'no-store' ? {} : { next: { revalidate: 300, ...options.next, tags: [...new Set(['catalog', ...(options.next?.tags || [])])] } }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new WooCommerceApiError(response.status, typeof data?.code === 'string' ? data.code : undefined);
    }
    return response;
  } catch (error) {
    if (error instanceof WooCommerceApiError) throw error;
    throw new WooCommerceApiError(502);
  }
}

export async function wcFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await wcResponse(endpoint, options);
  try { return await response.json() as T; }
  catch { throw new WooCommerceApiError(502, 'invalid_response'); }
}
