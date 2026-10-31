import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { PrivacyContent } from '@/features/privacy';

export const metadata: Metadata = { title: 'سیاست‌ها و حریم خصوصی', description: 'اطلاعات حساب، خرید و پرداخت شما در نوین رایانه همدان چگونه استفاده و نگهداری می‌شود؟', alternates: { canonical: '/privacy-policy' } };

export default function PrivacyPolicyPage() {
  return <main className="mx-auto w-[92%] max-w-5xl py-7 sm:py-12">
    <nav aria-label="مسیر راهنما" className="mb-7 flex items-center gap-2 text-xs text-muted-foreground"><Link href="/" className="hover:text-orange-600">خانه</Link><ChevronLeft className="size-3" /><span>سیاست‌ها و حریم خصوصی</span></nav>
    <header className="mb-7 rounded-3xl border border-border bg-gradient-to-bl from-orange-50/70 via-background to-background p-6 sm:p-9">
      <span className="mb-5 inline-flex size-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600"><ShieldCheck className="size-6" /></span>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">سیاست‌ها و حریم خصوصی</h1>
      <p className="mt-4 max-w-2xl text-sm leading-8 text-muted-foreground">اطلاعات شما بخشی از اعتماد شماست. اینجا درباره استفاده از اطلاعات حساب و سفارش، روش‌های پرداخت و راه‌های پیگیری درخواست‌ها توضیح می‌دهیم.</p>
    </header>
    <article className="rounded-3xl border border-border bg-background p-5 sm:p-9"><PrivacyContent /></article>
  </main>;
}
