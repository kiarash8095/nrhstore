'use client';

import Link from 'next/link';
import { ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PrivacyContent } from '@/features/privacy';

export function CheckoutPrivacy() {
  return <Dialog>
    <p className="flex items-start gap-2 text-xs leading-7 text-muted-foreground"><ShieldCheck className="mt-1.5 size-4 shrink-0 text-orange-600" /><span>اطلاعات شما برای پردازش و پیگیری سفارش استفاده می‌شود. پیش از ثبت سفارش، <DialogTrigger nativeButton={false} render={<a href="/privacy-policy" onClick={event => event.preventDefault()} className="inline-flex items-center whitespace-nowrap rounded-sm py-0.5 font-medium text-orange-700 underline decoration-orange-300 underline-offset-4 focus-visible:outline-2 focus-visible:outline-orange-500" />}>سیاست‌ها و حریم خصوصی</DialogTrigger> را مطالعه کنید.</span></p>
    <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl" dir="rtl">
      <DialogHeader className="border-b border-border px-5 py-5 pe-14 sm:px-7 sm:pe-16"><DialogTitle className="text-lg font-bold">سیاست‌ها و حریم خصوصی</DialogTitle><DialogDescription className="mt-2 text-xs leading-6">درباره اطلاعات حساب، خرید و شیوه‌های پرداخت در نوین رایانه همدان</DialogDescription></DialogHeader>
      <DialogClose aria-label="بستن سیاست‌های حریم خصوصی" className="absolute end-4 top-4 text-gray-500" render={<Button variant="ghost" size="icon-sm" />}><X className="size-4" /></DialogClose>
      <div className="max-h-[65dvh] overflow-y-auto overscroll-contain px-5 py-6 outline-none sm:px-7" tabIndex={0} aria-label="متن سیاست‌ها و حریم خصوصی"><PrivacyContent compact /></div>
      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-7"><Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground underline underline-offset-4 hover:text-orange-600">مشاهده صفحه مستقل</Link><DialogClose render={<Button variant="outline" size="sm" className="rounded-xl" />}>بستن</DialogClose></div>
    </DialogContent>
  </Dialog>;
}
