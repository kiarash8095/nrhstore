import { paymentStatusSchema } from './contracts';

export async function paymentStatus(orderId: number, refresh = false) {
  const response = await fetch('/api/payments/' + orderId, {
    method: refresh ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    ...(refresh ? { headers: { 'Content-Type': 'application/json' }, body: '{}' } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || 'بررسی وضعیت پرداخت ممکن نشد.');
  return paymentStatusSchema.parse(data);
}
