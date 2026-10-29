import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCartAuthContext } from '@/features/auth/server';
import { normalizeIranMobile, toAsciiDigits } from '@/features/auth/contracts';
import { isTrustedOriginRequest } from '@/lib/http/request-origin';
import { boundedJson, boundedText } from '@/lib/http/bounded-json';
import { getWordPressApiUrl } from '@/lib/wordpress/config';
import { consumeRateLimit } from '@/lib/server/rate-limit';
import { withCartLocks, CartLockBusyError } from '@/features/cart/server';
import { wcFetch } from '@/lib/woocommerce/store-client';
import { productPath } from '@/lib/urls';
import {
  addressInputSchema,
  statsSchema,
  wishlistInputSchema,
  wishlistSchema,
  profileInputSchema,
  type AccountProfile,
  type FavoriteProducts,
} from '../contracts';
import {
  normalizeOrder,
  normalizeOrderDetail,
  normalizeProfile,
  plainText,
  protectedProfileKey,
} from './normalize';

class AccountError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex',
      'Referrer-Policy': 'no-referrer',
      Vary: 'Cookie',
    },
  });
const idPattern = /^[1-9]\d{0,13}$/;
function input<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new AccountError(
      400,
      'invalid_input',
      result.error.issues[0]?.message || 'اطلاعات ورودی معتبر نیست.',
    );
  return result.data;
}
function parseId(value?: string) {
  if (!value || !idPattern.test(value) || !Number.isSafeInteger(Number(value)))
    throw new AccountError(400, 'invalid_input', 'شناسه معتبر نیست.');
  return Number(value);
}
function pageNumber(request: NextRequest) {
  if ([...request.nextUrl.searchParams.keys()].some((key) => key !== 'page'))
    throw new AccountError(400, 'invalid_input', 'پارامتر درخواست معتبر نیست.');
  const pages = request.nextUrl.searchParams.getAll('page');
  if (pages.length > 1 || (pages[0] && !/^[1-9]\d{0,3}$/.test(pages[0])))
    throw new AccountError(400, 'invalid_input', 'شماره صفحه معتبر نیست.');
  return Number(pages[0] || '1');
}
async function readInput(request: NextRequest) {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json')
    throw new AccountError(415, 'invalid_input', 'قالب درخواست معتبر نیست.');
  try {
    return JSON.parse(await boundedText(new Response(request.body), 24 * 1024));
  } catch {
    throw new AccountError(
      400,
      'invalid_input',
      'اطلاعات درخواست معتبر نیست یا بیش از حد بزرگ است.',
    );
  }
}

type Auth = NonNullable<Awaited<ReturnType<typeof getCartAuthContext>>>;
async function upstream(
  auth: Auth,
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<unknown> {
  const url = new URL(getWordPressApiUrl() + path);
  if (method === 'GET')
    url.searchParams.set('_nrh_request', crypto.randomUUID());
  const response = await fetch(url, {
    method,
    headers: {
      ...auth.headers,
      Accept: 'application/json',
      'Cache-Control': 'no-cache, no-store',
      Pragma: 'no-cache',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  if (
    /hit|stale|updating|revalidated/i.test(
      ['X-LiteSpeed-Cache', 'CF-Cache-Status', 'X-Cache']
        .map((name) => response.headers.get(name))
        .join(' '),
    ) ||
    Number(response.headers.get('Age')) > 0
  )
    throw new Error('Private response was cached');
  const data = await boundedJson(response, 512 * 1024);
  const record =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  if (
    !response.ok ||
    record?.success === false ||
    record?.ok === false ||
    record?.error
  ) {
    if ([401, 403].includes(response.status))
      throw new AccountError(
        401,
        'session_expired',
        'نشست شما پایان یافته است. دوباره وارد حساب شوید.',
      );
    if (response.status === 404)
      throw new AccountError(404, 'not_found', 'اطلاعات مورد نظر پیدا نشد.');
    if (response.status === 429)
      throw new AccountError(
        429,
        'rate_limited',
        'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.',
      );
    throw new AccountError(
      response.status >= 500 ? 502 : 400,
      'account_rejected',
      response.status >= 500
        ? 'سرویس حساب کاربری موقتاً در دسترس نیست.'
        : 'فروشگاه اطلاعات را نپذیرفت. ورودی‌ها را بررسی و دوباره تلاش کنید.',
    );
  }
  return data;
}
async function currency() {
  const products = await wcFetch<{ prices?: { currency_code?: string } }[]>(
    '/products?per_page=1&_fields=prices',
  );
  const code = products[0]?.prices?.currency_code;
  if (!code || !/^[A-Z]{3,6}$/.test(code))
    throw new Error('Missing store currency');
  return code;
}
function hasCurrency(order: unknown) {
  return (
    !!order &&
    typeof order === 'object' &&
    typeof (order as { currency?: unknown }).currency === 'string' &&
    !!(order as { currency: string }).currency.trim()
  );
}
function idsFrom(value: unknown) {
  const ids = Array.isArray(value)
    ? value
    : value &&
        typeof value === 'object' &&
        Object.keys(value).every((key) => /^\d+$/.test(key))
      ? Object.values(value)
      : null;
  return wishlistSchema.parse({
    ids: z.array(z.number().int().positive().safe()).max(2000).parse(ids),
  }).ids;
}
async function profile(auth: Auth) {
  return normalizeProfile(await upstream(auth, '/boom/v1/profile-fields'));
}
function validatedProfile(input: unknown, current: AccountProfile) {
  const { values } = profileInputSchema.parse(input);
  const allowed = current.fields.filter(
    (field) => field.editable && !protectedProfileKey(field.key),
  );
  if (
    Object.keys(values).some(
      (key) => !allowed.some((field) => field.key === key),
    )
  )
    throw new AccountError(
      400,
      'invalid_input',
      'این قسمت از پروفایل قابل ویرایش نیست.',
    );
  const result: Record<string, string> = Object.fromEntries(
    current.fields
      .filter((field) => !field.editable)
      .map((field) => [field.key, current.values[field.key] || '']),
  );
  for (const field of allowed) {
    if (!(field.key in values)) {
      if (field.required)
        throw new AccountError(
          400,
          'invalid_input',
          field.label + ' را کامل کنید.',
        );
      continue;
    }
    const value = values[field.key].trim();
    if (
      (field.required && !value) ||
      (field.type === 'email' &&
        value &&
        !z.email().safeParse(value).success) ||
      (field.type === 'tel' &&
        value &&
        !/^09\d{9}$/.test(normalizeIranMobile(value))) ||
      (field.type === 'number' &&
        value &&
        !/^-?\d+(?:\.\d+)?$/.test(toAsciiDigits(value))) ||
      (field.type === 'select' && value && !field.options.includes(value))
    )
      throw new AccountError(
        400,
        'invalid_input',
        field.label + ' را کامل و درست وارد کنید.',
      );
    result[field.key] =
      field.type === 'tel'
        ? normalizeIranMobile(value)
        : field.type === 'number'
          ? toAsciiDigits(value)
          : value;
  }
  return { values: result };
}

export async function accountHandler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    if (!isTrustedOriginRequest(request))
      return json(
        { code: 'forbidden_origin', message: 'مبدأ درخواست معتبر نیست.' },
        403,
      );
    const { path } = await context.params;
    if (
      !path.length ||
      path.length > 3 ||
      path.some((part) => !/^[a-z0-9-]+$/.test(part))
    )
      return json({ message: 'مسیر پیدا نشد.' }, 404);
    const [resource, item, action] = path;
    const method = request.method;
    const routeAllowed =
      (method === 'GET' &&
        ((['orders', 'wishlist', 'addresses', 'profile', 'stats'].includes(
          resource,
        ) &&
          path.length === 1) ||
          (resource === 'orders' &&
            path.length === 2 &&
            idPattern.test(item)) ||
          (resource === 'wishlist' &&
            item === 'products' &&
            path.length === 2))) ||
      (method === 'POST' &&
        ((['wishlist', 'addresses', 'profile'].includes(resource) &&
          path.length === 1) ||
          (resource === 'addresses' &&
            path.length === 3 &&
            idPattern.test(item) &&
            action === 'default'))) ||
      (method === 'PUT' &&
        resource === 'addresses' &&
        path.length === 2 &&
        idPattern.test(item)) ||
      (method === 'DELETE' &&
        ['addresses', 'wishlist'].includes(resource) &&
        path.length === 2 &&
        idPattern.test(item));
    if (!routeAllowed)
      return json({ code: 'not_found', message: 'مسیر پیدا نشد.' }, 404);
    const page = pageNumber(request);
    if (method === 'DELETE' && request.body) {
      // Next may supply an empty stream for an HTTP DELETE with no body.
      // Reject actual content, rather than the presence of that stream.
      try {
        if ((await boundedText(new Response(request.body), 1)).length)
          return json({ message: 'درخواست حذف نباید بدنه داشته باشد.' }, 400);
      } catch {
        return json({ message: 'درخواست حذف نباید بدنه داشته باشد.' }, 400);
      }
    }
    if (method !== 'GET' && request.nextUrl.searchParams.size)
      return json({ message: 'پارامتر درخواست معتبر نیست.' }, 400);
    const auth = await getCartAuthContext(request);
    if (!auth)
      return json(
        { code: 'session_expired', message: 'برای مشاهده حساب وارد شوید.' },
        401,
      );
    const identity = request.headers.get('X-NRH-Account-Identity');
    if (identity && identity !== auth.userId)
      return json(
        {
          code: 'session_changed',
          message: 'حساب فعال تغییر کرده است. صفحه را تازه‌سازی کنید.',
        },
        409,
      );
    if (
      !consumeRateLimit(
        'account:' + method + ':' + auth.userId,
        method === 'GET' ? 120 : 25,
        60000,
      ).allowed
    )
      return json(
        {
          code: 'rate_limited',
          message: 'درخواست‌های زیادی ارسال شده است. کمی صبر کنید.',
        },
        429,
      );
    const execute = async () => {
      if (resource === 'orders') {
        const raw = await upstream(
          auth,
          '/boom/v1/my-orders' +
            (item ? '/' + parseId(item) : '?page=' + page + '&per_page=10'),
        );
        if (item) {
          const data = z
            .object({ success: z.literal(true), order: z.unknown() })
            .parse(raw);
          return json(
            normalizeOrderDetail(
              data.order,
              parseId(item),
              auth.userId,
              hasCurrency(data.order) ? '' : await currency(),
            ),
          );
        }
        const data = z
          .object({
            success: z.literal(true),
            orders: z.array(z.unknown()).max(100),
            current_page: z.number().int().positive(),
            max_num_pages: z.number().int().nonnegative(),
          })
          .parse(raw);
        if (data.current_page !== page) throw new Error('Page mismatch');
        const code = data.orders.some((order) => !hasCurrency(order))
          ? await currency()
          : '';
        return json({
          orders: data.orders.map((order) =>
            normalizeOrder(order, auth.userId, code),
          ),
          page: data.current_page,
          pages: data.max_num_pages,
        });
      }
      if (resource === 'stats') {
        const data = z
          .object({
            success: z.literal(true),
            completed_orders: z.number().int().nonnegative(),
            cancelled_orders: z.number().int().nonnegative(),
            refunded_orders: z.number().int().nonnegative(),
          })
          .parse(await upstream(auth, '/boom-wallet/v1/balance'));
        return json(
          statsSchema.parse({
            completed: data.completed_orders,
            cancelled: data.cancelled_orders,
            refunded: data.refunded_orders,
          }),
        );
      }
      if (resource === 'profile') {
        if (method === 'GET') return json(await profile(auth));
        const submitted = input(profileInputSchema, await readInput(request));
        const validated = validatedProfile(submitted, await profile(auth));
        await upstream(auth, '/boom/v1/profile-fields', 'POST', validated);
        return json({ ok: true });
      }
      if (resource === 'addresses') {
        const endpoint =
          '/boom/v1/addresses' +
          (item ? '/' + parseId(item) : '') +
          (action ? '/default' : '');
        if (method === 'GET') {
          const data = z
            .object({
              addresses: z.array(z.record(z.string(), z.unknown())).max(100),
            })
            .parse(await upstream(auth, endpoint));
          // Reads accept older saved addresses even when today's form is stricter.
          const normalized = data.addresses.map((address) => ({
            ...address,
            id: parseId(String(address.id)),
            is_default:
              address.is_default === true ||
              address.is_default === 1 ||
              address.is_default === '1',
            ...Object.fromEntries(
              [
                'title',
                'first_name',
                'last_name',
                'phone',
                'state',
                'city',
                'address',
                'postcode',
              ].map((key) => [
                key,
                typeof address[key] === 'string' ? plainText(address[key]) : '',
              ]),
            ),
          }));
          return json({
            addresses: normalized.map((address) => ({
              id: address.id,
              is_default: address.is_default,
              ...Object.fromEntries(
                [
                  'title',
                  'first_name',
                  'last_name',
                  'phone',
                  'state',
                  'city',
                  'address',
                  'postcode',
                ].map((key) => [key, address[key as keyof typeof address]]),
              ),
            })),
          });
        }
        const data =
          method === 'POST' && action === 'default'
            ? input(z.object({}).strict(), await readInput(request))
            : method === 'DELETE'
              ? undefined
              : input(addressInputSchema, await readInput(request));
        await upstream(auth, endpoint, method, data);
        return json({ ok: true });
      }
      const endpoint =
        '/boom/v1/wishlist' +
        (item && item !== 'products' ? '/' + parseId(item) : '');
      const submitted =
        method === 'POST'
          ? input(wishlistInputSchema, await readInput(request))
          : undefined;
      const ids = idsFrom(await upstream(auth, endpoint, method, submitted));
      if (item !== 'products')
        return json(method === 'GET' ? { ids } : { ok: true, ids });
      const size = 12,
        chosen = ids.slice((page - 1) * size, page * size);
      if (!chosen.length)
        return json({
          items: [],
          page,
          pages: Math.ceil(ids.length / size),
          total: ids.length,
        });
      const products = z
        .array(
          z.object({
            id: z.number().int().positive().safe(),
            name: z.string().max(2000),
            slug: z.string().max(500),
            is_in_stock: z.boolean(),
            images: z.array(z.object({ src: z.string().max(2000) })).max(50),
            prices: z.object({
              price: z.string().regex(/^\d{1,18}$/),
              currency_code: z.string().max(12),
              currency_minor_unit: z.number().int().min(0).max(6),
            }),
          }),
        )
        .max(24)
        .parse(
          await wcFetch(
            '/products?include=' + chosen.join(',') + '&per_page=12',
          ),
        );
      const data: FavoriteProducts = {
        items: products
          .filter((product) => chosen.includes(product.id))
          .map((product) => ({
            id: product.id,
            name: plainText(product.name),
            path: productPath(product.slug),
            image: product.images[0]?.src || '',
            price: product.prices.price,
            currency: product.prices.currency_code,
            minorUnit: product.prices.currency_minor_unit,
            inStock: product.is_in_stock,
          })),
        page,
        pages: Math.ceil(ids.length / size),
        total: ids.length,
      };
      return json(data);
    };
    return method === 'GET'
      ? await execute()
      : await withCartLocks(
          [
            'account:' + auth.userId,
            ...(resource === 'addresses' ? ['cart:' + auth.userId] : []),
          ],
          execute,
        );
  } catch (error) {
    if (error instanceof AccountError)
      return json({ code: error.code, message: error.message }, error.status);
    if (error instanceof z.ZodError)
      return json(
        {
          code: 'invalid_response',
          message: 'پاسخ سرویس حساب معتبر نیست. کمی بعد دوباره تلاش کنید.',
        },
        502,
      );
    if (error instanceof CartLockBusyError)
      return json(
        {
          code: 'account_busy',
          message: 'درخواست قبلی در حال انجام است. کمی بعد تلاش کنید.',
        },
        409,
      );
    return json(
      {
        code: 'account_unavailable',
        message: 'ارتباط با سرویس حساب کاربری برقرار نشد. دوباره تلاش کنید.',
      },
      502,
    );
  }
}
