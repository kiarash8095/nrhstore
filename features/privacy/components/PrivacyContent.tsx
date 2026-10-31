import { Mail, Phone } from 'lucide-react';
import { privacySections, privacyUpdatedAt } from '../content';

export function PrivacyContent({ compact = false }: { compact?: boolean }) {
  const prefix = compact ? 'privacy-dialog-' : 'privacy-';
  return <div className="space-y-7 text-right" dir="rtl">
    <p className="text-xs leading-6 text-muted-foreground">آخرین ویرایش: {privacyUpdatedAt}</p>
    {!compact && <nav aria-label="فهرست سیاست‌ها" className="rounded-2xl border border-border bg-muted/40 p-5">
      <p className="mb-4 text-sm font-bold">دسترسی سریع</p>
      <ol className="grid gap-3 text-sm sm:grid-cols-2">{privacySections.map((section, index) => <li key={section.id}><a href={'#' + prefix + section.id} className="leading-7 text-muted-foreground underline-offset-4 hover:text-orange-600 hover:underline">{(index + 1).toLocaleString('fa-IR')}. {section.title}</a></li>)}</ol>
    </nav>}
    {privacySections.map((section, index) => <section key={section.id} id={prefix + section.id} aria-labelledby={prefix + section.id + '-title'} className="scroll-mt-28 border-b border-border/70 pb-7">
      <h2 id={prefix + section.id + '-title'} className="mb-3 flex items-baseline gap-2 text-base font-bold text-foreground"><span className="text-xs font-normal text-orange-600">{(index + 1).toLocaleString('fa-IR')}.</span>{section.title}</h2>
      <div className="space-y-3 text-sm leading-8 text-muted-foreground">{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
    </section>)}
    <section className="rounded-2xl border border-orange-100 bg-orange-50/50 p-5" aria-label="ارتباط درباره حریم خصوصی">
      <h2 className="mb-2 text-sm font-bold">پرسشی درباره اطلاعات خود دارید؟</h2>
      <p className="text-sm leading-8 text-muted-foreground">پشتیبانی نوین رایانه همدان برای پیگیری درخواست‌های حساب و سفارش در دسترس شماست.</p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm"><a href="tel:08131775" className="inline-flex items-center gap-2 text-orange-700 underline-offset-4 hover:underline"><Phone className="size-4" /><bdi>۰۸۱–۳۱۷۷۵</bdi></a><a href="mailto:info@nrh.ir" className="inline-flex items-center gap-2 text-orange-700 underline-offset-4 hover:underline"><Mail className="size-4" /><bdi>info@nrh.ir</bdi></a></div>
    </section>
  </div>;
}
