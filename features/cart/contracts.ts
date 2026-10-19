import { z } from 'zod';

export const addItemSchema = z.object({
  id: z.number().int().positive(),
  quantity: z.number().positive().finite(),
  variation: z.array(z.object({ attribute: z.string().min(1).max(200), value: z.string().max(500) }).strict()).max(30).optional(),
}).strict();
export const itemKeySchema = z.object({ key: z.string().regex(/^[a-zA-Z0-9_-]{32}$/) }).strict();
export const updateItemSchema = itemKeySchema.extend({ quantity: z.number().positive().finite() });
export const couponSchema = z.object({ code: z.string().trim().min(1).max(100) }).strict();
const text = z.string().max(300);
export const addressSchema = z.object({
  first_name: text.optional(), last_name: text.optional(), company: text.optional(),
  address_1: text.optional(), address_2: text.optional(), city: text.optional(),
  state: text.optional(), postcode: text.optional(), country: z.string().regex(/^[A-Z]{2}$/).optional(),
  phone: text.optional(), email: z.union([z.email(), z.literal('')]).optional(),
}).strict();
export const customerSchema = z.object({ billing_address: addressSchema, shipping_address: addressSchema }).strict();
export const shippingSchema = z.object({ package_id: z.union([z.number().int().nonnegative(), z.string().max(100)]), rate_id: z.string().min(1).max(200) }).strict();
export type AddCartItemInput = z.infer<typeof addItemSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type ShippingInput = z.infer<typeof shippingSchema>;
export type { WooCommerceCart, WooCommerceCartItem } from './types/woocommerce.types';
