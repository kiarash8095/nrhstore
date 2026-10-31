import { MessageSquareText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export function CheckoutNotes({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (value: string) => void }) {
  return <section aria-labelledby="checkout-notes-title" className="rounded-2xl border border-orange-200/70 bg-gradient-to-bl from-orange-50/70 to-white p-5 sm:p-6">
    <div className="mb-3 flex items-center justify-between gap-3"><h2 id="checkout-notes-title" className="flex items-center gap-2 text-sm font-bold"><MessageSquareText className="size-5 text-orange-600" />نکته‌ای برای سفارش دارید؟</h2><span className="rounded-full bg-white px-2.5 py-1 text-[10px] text-muted-foreground ring-1 ring-orange-100">اختیاری</span></div>
    <p id="checkout-notes-help" className="mb-4 text-xs leading-7 text-muted-foreground">اگر نکته‌ای برای تحویل یا آماده‌سازی سفارش دارید، اینجا بنویسید. لطفاً اطلاعات کارت یا رمزهای بانکی را وارد نکنید.</p>
    <label htmlFor="checkout-customer-note" className="sr-only">توضیحات سفارش</label>
    <Textarea id="checkout-customer-note" name="customer_note" value={value} onChange={event => onChange(event.target.value)} disabled={disabled} maxLength={1000} rows={3} aria-describedby="checkout-notes-help checkout-notes-count" placeholder="مثلاً: پیش از تحویل با گیرنده تماس بگیرید…" className="min-h-28 resize-y rounded-xl border border-orange-100 bg-white text-sm leading-7 focus-visible:border-orange-400 focus-visible:ring-orange-100" />
    <p id="checkout-notes-count" className="mt-2 text-left text-[10px] text-muted-foreground">{value.length.toLocaleString('fa-IR')} / ۱٬۰۰۰</p>
  </section>;
}
