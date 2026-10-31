import { z } from 'zod';
import { iranMobileSchema, toAsciiDigits } from '@/features/auth/contracts';

export const accountSections = [
  'dashboard',
  'orders',
  'cart',
  'wishlist',
  'support',
  'addresses',
  'profile',
] as const;
export type AccountSection = (typeof accountSections)[number];
export const accountIdSchema = z.coerce.number().int().positive().safe();
const text = z.string().max(500);
const amount = z.string().regex(/^\d{1,16}(?:\.\d{1,6})?$/);
export const orderSchema = z.object({
  id: accountIdSchema,
  number: text,
  status: z.string().regex(/^[a-z][a-z0-9-]{0,49}$/),
  date: text,
  total: amount,
  currency: z.string().max(12),
});
export const orderListSchema = z.object({
  orders: z.array(orderSchema).max(100),
  page: z.number().int().positive(),
  pages: z.number().int().nonnegative(),
});
export const orderDetailSchema = orderSchema.extend({
  shippingTotal: amount,
  discountTotal: amount,
  paymentMethod: text,
  trackingNumber: text,
  shippingCompany: text,
  address: z.object({
    name: text,
    address: z.string().max(2000),
    phone: text,
    postcode: text,
  }),
  items: z
    .array(
      z.object({
        id: accountIdSchema,
        productId: z.number().int().nonnegative().safe(),
        name: text,
        quantity: z.number().positive().finite(),
        total: amount,
      }),
    )
    .max(300),
  notes: z
    .array(
      z.object({
        id: accountIdSchema,
        content: z.string().max(8000),
        date: text,
      }),
    )
    .max(100),
});
export const statsSchema = z.object({
  completed: z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative(),
  refunded: z.number().int().nonnegative(),
});

export const addressInputSchema = z
  .object({
    title: z.string().trim().min(2, 'عنوان آدرس را وارد کنید.').max(60),
    first_name: z.string().trim().min(2, 'نام گیرنده را کامل کنید.').max(80),
    last_name: z
      .string()
      .trim()
      .min(2, 'نام خانوادگی گیرنده را کامل کنید.')
      .max(100),
    phone: iranMobileSchema,
    state: z.string().trim().min(1, 'استان را انتخاب کنید.').max(100),
    city: z.string().trim().min(2, 'شهر را وارد کنید.').max(100),
    address: z.string().trim().min(8, 'نشانی کامل را وارد کنید.').max(500),
    postcode: z
      .string()
      .transform(toAsciiDigits)
      .pipe(z.string().regex(/^\d{10}$/, 'کد پستی باید ۱۰ رقم باشد.')),
  })
  .strict();
export const savedAddressSchema = z.object({
  id: accountIdSchema,
  is_default: z.boolean(),
  title: text,
  first_name: text,
  last_name: text,
  phone: text,
  state: text,
  city: text,
  address: z.string().max(2000),
  postcode: text,
});
export const addressesSchema = z.object({
  addresses: z.array(savedAddressSchema).max(100),
});
export const wishlistSchema = z.object({
  ids: z.array(accountIdSchema).max(2000),
});
export const wishlistInputSchema = z
  .object({ product_id: accountIdSchema })
  .strict();
export const favoriteProductsSchema = z.object({
  items: z
    .array(
      z.object({
        id: accountIdSchema,
        name: text,
        path: z.string().startsWith('/products/').max(1000),
        image: z.string().max(2000),
        price: amount,
        currency: text,
        minorUnit: z.number().int().min(0).max(6),
        inStock: z.boolean(),
      }),
    )
    .max(24),
  page: z.number().int().positive(),
  pages: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const profileFieldSchema = z.object({
  key: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/),
  label: z.string().max(150),
  type: z.enum([
    'text',
    'email',
    'tel',
    'number',
    'textarea',
    'select',
    'file',
  ]),
  required: z.boolean(),
  options: z.array(z.string().max(300)).max(100),
  editable: z.boolean(),
});
export const profileSchema = z.object({
  fields: z.array(profileFieldSchema).max(40),
  values: z.record(z.string(), z.string().max(2000)),
});
export const profileInputSchema = z
  .object({
    values: z
      .record(
        z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/),
        z.string().max(2000),
      )
      .refine((value) => Object.keys(value).length <= 40),
  })
  .strict();
export const okSchema = z.object({ ok: z.literal(true) });

export type AccountOrder = z.infer<typeof orderSchema>;
export type AccountOrderDetail = z.infer<typeof orderDetailSchema>;
export type OrderList = z.infer<typeof orderListSchema>;
export type AccountStats = z.infer<typeof statsSchema>;
export type AddressInput = z.infer<typeof addressInputSchema>;
export type SavedAddress = z.infer<typeof savedAddressSchema>;
export type AccountProfile = z.infer<typeof profileSchema>;
export type ProfileField = z.infer<typeof profileFieldSchema>;
export type FavoriteProducts = z.infer<typeof favoriteProductsSchema>;
