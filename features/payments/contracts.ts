import { z } from 'zod';

export const paymentStatusSchema = z.object({
  order_id: z.number().int().positive().safe(), status: z.string().regex(/^[a-z-]{1,40}$/),
  paid: z.boolean(), payment_state: z.enum(['requesting', 'request_unknown', 'rejected', 'awaiting', 'verify_pending', 'verified', 'paid']),
  reference: z.string().regex(/^[0-9]{0,40}$/),
}).strict();
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
