import { decodeHTML } from 'entities';
import { z } from 'zod';
import { iranProvinces } from '@/features/cart/constants/iran-provinces';
import {
  orderSchema,
  orderDetailSchema,
  profileSchema,
  type AccountProfile,
} from '../contracts';

export function plainText(value: string) {
  return decodeHTML(value.replace(/<[^>]*>/g, ''))
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim();
}
const rawText = z
  .union([z.string().max(8000), z.number().finite()])
  .transform(String);
const rawAmount = z
  .union([
    z.string().regex(/^\d{1,16}(?:\.\d{1,6})?$/),
    z.number().nonnegative().finite(),
  ])
  .transform(String);
const rawOrder = z.object({
  id: z.coerce.number().int().positive().safe(),
  customer_id: z.coerce.number().int().nonnegative().optional(),
  order_number: rawText.optional(),
  status: z.string(),
  date_created: z.string().max(100).nullish(),
  total: rawAmount,
  currency: z.string().max(12).optional(),
});

export function normalizeOrder(
  value: unknown,
  identity: string,
  currency: string,
) {
  const order = rawOrder.parse(value);
  if (order.customer_id !== undefined && String(order.customer_id) !== identity)
    throw new Error('Order owner mismatch');
  return orderSchema.parse({
    id: order.id,
    number: plainText(order.order_number || String(order.id)),
    status: order.status.replace(/^wc-/, ''),
    date: order.date_created || '',
    total: order.total,
    currency: order.currency || currency,
  });
}

export function normalizeOrderDetail(
  value: unknown,
  id: number,
  identity: string,
  currency: string,
) {
  const order = normalizeOrder(value, identity, currency);
  if (order.id !== id) throw new Error('Order ID mismatch');
  const address = z.object({
    first_name: rawText.optional(),
    last_name: rawText.optional(),
    address_1: rawText.optional(),
    address_2: rawText.optional(),
    city: rawText.optional(),
    state: rawText.optional(),
    phone: rawText.optional(),
    postcode: rawText.optional(),
  });
  const raw = z
    .object({
      shipping_total: rawAmount.optional(),
      discount_total: rawAmount.optional(),
      payment_method_title: rawText.optional(),
      payment_method: rawText.optional(),
      tracking_number: rawText.nullish(),
      shipping_company: rawText.nullish(),
      billing: address.optional(),
      shipping: address.optional(),
      line_items: z
        .array(
          z.object({
            id: z.coerce.number().int().positive().safe(),
            product_id: z.coerce.number().int().nonnegative().safe().optional(),
            name: z.string().max(2000),
            quantity: z.coerce.number().positive().finite(),
            total: rawAmount,
          }),
        )
        .max(300),
      customer_notes: z
        .array(
          z.object({
            id: z.coerce.number().int().positive().safe(),
            content: z.string().max(8000),
            date: rawText.optional(),
          }),
        )
        .max(100)
        .optional(),
    })
    .parse(value);
  const destination = raw.shipping?.address_1 ? raw.shipping : raw.billing;
  return orderDetailSchema.parse({
    ...order,
    shippingTotal: raw.shipping_total || '0',
    discountTotal: raw.discount_total || '0',
    paymentMethod: plainText(
      raw.payment_method_title || raw.payment_method || '',
    ),
    trackingNumber: plainText(raw.tracking_number || ''),
    shippingCompany: plainText(raw.shipping_company || ''),
    address: {
      name: plainText(
        [destination?.first_name, destination?.last_name]
          .filter(Boolean)
          .join(' '),
      ),
      address: plainText(
        [
          iranProvinces.find(([code]) => code === destination?.state)?.[1] ||
            destination?.state,
          destination?.city,
          destination?.address_1,
          destination?.address_2,
        ]
          .filter(Boolean)
          .join('، '),
      ),
      phone: plainText(destination?.phone || raw.billing?.phone || ''),
      postcode: plainText(destination?.postcode || ''),
    },
    items: raw.line_items.map((item) => ({
      id: item.id,
      productId: item.product_id || 0,
      name: plainText(item.name),
      quantity: item.quantity,
      total: item.total,
    })),
    notes: (raw.customer_notes || []).map((note) => ({
      id: note.id,
      content: plainText(note.content),
      date: note.date || '',
    })),
  });
}

// Only fields actually configured by Boom may be written. Authentication and
// privilege metadata can never become editable through dynamic field settings.
export function protectedProfileKey(key: string) {
  return (
    /(?:^|_)(?:roles?|capabilities|capability|password|pass|token|nonce|session|auth|login|activation|admin|level)(?:_|$)/i.test(
      key,
    ) ||
    [
      'id',
      'user_id',
      'customer_id',
      'phone',
      'user_phone',
      '__proto__',
      'prototype',
      'constructor',
    ].includes(key.toLowerCase())
  );
}
export function normalizeProfile(value: unknown): AccountProfile {
  const raw = z
    .object({
      fields: z
        .array(
          z.object({
            key: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/),
            label: z.string().max(150).optional(),
            type: z.string().max(40).optional(),
            required: z
              .union([z.boolean(), z.literal(0), z.literal(1)])
              .optional(),
            options: z
              .union([
                z.string().max(8000),
                z.array(z.string().max(300)).max(100),
              ])
              .optional(),
          }),
        )
        .max(40),
      values: z
        .record(
          z.string(),
          z.union([z.string().max(2000), z.number().finite(), z.null()]),
        )
        .optional(),
    })
    .parse(value);
  const fields = raw.fields
    .filter(
      (field) =>
        !protectedProfileKey(field.key) ||
        ['phone', 'user_phone'].includes(field.key),
    )
    .map((field) => ({
      key: field.key,
      label: plainText(field.label || field.key),
      type: ([
        'text',
        'email',
        'tel',
        'number',
        'textarea',
        'select',
        'file',
      ].includes(field.type || '')
        ? field.type
        : 'text') as AccountProfile['fields'][number]['type'],
      required: !!field.required,
      options: Array.isArray(field.options)
        ? field.options
        : (field.options || '')
            .split(',')
            .map((option) => option.trim())
            .filter(Boolean),
      editable: !protectedProfileKey(field.key) && field.type !== 'file',
    }));
  return profileSchema.parse({
    fields,
    values: Object.fromEntries(
      fields.map((field) => [field.key, String(raw.values?.[field.key] ?? '')]),
    ),
  });
}
