import { NextRequest, NextResponse } from 'next/server';
import { wcResponse } from '@/lib/woocommerce/store-client';
import { WooCommerceApiError } from '@/lib/woocommerce/api-error';
import { consumeRateLimit } from '@/lib/server/rate-limit';

const allowedPaths = /^(products|products\/\d+|products\/categories|products\/categories\/\d+|products\/brands|products\/reviews)$/;
const allowedQuery = new Set(['page', 'per_page', 'category', 'include', 'exclude', 'search', 'slug', 'parent', 'hide_empty', 'orderby', 'order']);

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join('/');
  if (!allowedPaths.test(path)) return NextResponse.json({ message: 'Not found.' }, { status: 404 });
  const limit = consumeRateLimit(`catalog:${request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'}`, 180, 60000);
  if (!limit.allowed) return NextResponse.json({ message: 'Too many requests.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
  const query = new URLSearchParams();
  for (const [key, value] of request.nextUrl.searchParams) {
    if (!allowedQuery.has(key) || query.has(key) || value.length > 300) return NextResponse.json({ message: 'Invalid query.' }, { status: 400 });
    if (['page', 'per_page', 'parent'].includes(key) && (!/^\d+$/.test(value) || Number(value) < (key === 'parent' ? 0 : 1) || Number(value) > (key === 'per_page' ? 100 : 100000))) {
      return NextResponse.json({ message: 'Invalid pagination.' }, { status: 400 });
    }
    query.set(key, value);
  }
  if (!query.has('per_page')) query.set('per_page', '10');
  try {
    const upstream = await wcResponse(`/${path}?${query}`);
    const response = NextResponse.json(await upstream.json());
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=60');
    response.headers.set('X-Robots-Tag', 'noindex');
    for (const header of ['X-WP-Total', 'X-WP-TotalPages']) {
      const value = upstream.headers.get(header);
      if (value) response.headers.set(header, value);
    }
    return response;
  } catch (error) {
    const status = error instanceof WooCommerceApiError && error.status < 500 ? error.status : 502;
    return NextResponse.json({ message: 'دریافت اطلاعات فروشگاه ممکن نشد.' }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
