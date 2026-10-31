import { z } from 'zod';

export const paymentStatusSchema = z.object({
  order_id: z.number().int().positive().safe(), status: z.string().regex(/^[a-z-]{1,40}$/),
  paid: z.boolean(), payment_state: z.enum(['requesting', 'request_unknown', 'rejected', 'awaiting', 'verify_pending', 'verified', 'paid', 'transfer_processing', 'transfer_pending']),
  reference: z.string().regex(/^[0-9]{0,40}$/),
  payment_method: z.enum(['melli_pay', 'bacs']).optional(),
  bank_transfer: z.object({
    instructions: z.string().max(3000),
    accounts: z.array(z.object({ account_name: z.string().max(100), account_number: z.string().max(100), bank_name: z.string().max(100), sort_code: z.string().max(100), iban: z.string().max(100), bic: z.string().max(100) }).strict()).max(5),
  }).strict().nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.bank_transfer && (value.payment_method !== 'bacs' || value.paid || value.status !== 'on-hold')) context.addIssue({ code: 'custom', message: 'Unexpected bank instructions' });
  if (value.payment_state.startsWith('transfer_') && value.payment_method !== 'bacs') context.addIssue({ code: 'custom', message: 'Unexpected transfer state' });
});
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
