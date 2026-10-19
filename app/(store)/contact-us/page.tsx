import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'تماس با ما', description: 'آدرس و راه ارتباطی فروشگاه نوین رایانه همدان.', alternates: { canonical: '/contact-us' } };

export default function ContactPage() {
  return <main className="mx-auto w-full max-w-4xl px-4 py-12">
    <h1 className="mb-6 text-2xl font-bold">تماس با نوین رایانه همدان</h1>
    <address className="space-y-4 rounded-2xl border bg-white p-6 not-italic leading-8">
      <p>همدان، خیابان بوعلی، کوچه شریف، ساختمان نوین</p>
      <p>تلفن: <a className="text-orange-600" href="tel:08131775" dir="ltr">۰۸۱-۳۱۷۷۵</a></p>
    </address>
  </main>;
}
