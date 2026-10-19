# معماری پروژه و مسیر اجرای برنامه

هدف این معماری، جداکردن «نمایش»، «قوانین فروشگاه» و «ارتباط با سرویس‌ها» است. Next.js مالک صفحات و URL عمومی است. ووکامرس محصولات و سبد و قوانین خرید را مدیریت می‌کند. ورود مشتری از افزونه اختصاصی Boom استفاده می‌کند؛ بنرها فعلاً روی دیسک خود سرور Next نگهداری می‌شوند.

**نقشه پوشه‌ها**

| مسیر | مسئولیت و محل مناسب تغییر |
| --- | --- |
| `app` | ورودی Route، layout، metadata و Route Handler |
| `features` | منطق و UI اختصاصی هر قابلیت |
| `components/ui` | اجزای عمومی مثل Button و Dialog |
| `components/common` | Pagination، Skeleton، JsonLd و ابزارهای نمایشی مشترک |
| `components/layout` | ترکیب هدر، فوتر و ناوبری با فیچرهای مختلف |
| `providers` | راه‌اندازی Query و چرخه نشست و سبد در ریشه |
| `lib` | ارتباط HTTP، تنظیم QueryClient، URL، فونت و زیرساخت مشترک |
| `styles` و `public` | CSS سراسری و فایل‌های ثابت |

فیچر فقط پوشه‌هایی را می‌سازد که لازم دارد: `components`، `hooks`، `api`، `server`، `schemas`، `types`، `store` و `tests`. کوچک‌بودن `page.tsx` طبیعی است؛ اغلب اجرای اصلی را به فیچر می‌سپارد.

**Routeها چگونه به قابلیت وصل می‌شوند؟**

مثلاً [صفحه محصول](D:/Projects2/nrh_store_nextjs/app/(store)/products/[slug]/page.tsx)، صفحه و metadata را از ورودی سروری محصول می‌گیرد. مسیرهای API نیز به handler فیچر واگذار می‌شوند. این جداسازی باعث می‌شود منطق به فایل‌های قرارداد Next گره نخورد.

گروه‌های `(store)`، `(account)` و `(admin)` در URL ظاهر نمی‌شوند: فایل داخل `(account)/dashboard` همان `/dashboard` است. در کد فعلی همه از root layout استفاده می‌کنند؛ پنل بنر خودبه‌خود shell مستقل ندارد. `/account` در matcher محافظت آمده، اما Route عمومی متناظر ساخته نشده است.

**سرور و کلاینت را چطور تشخیص بدهم؟**

Server Component برای گرفتن داده و ساخت HTML مناسب است؛ کامپوننت تعاملی دارای state، event یا API مرورگر، ورودی `"use client"` می‌خواهد. این دستور مرز گراف import را تعیین می‌کند؛ سروری‌بودن والد با قراردادن children در یک Provider کلاینتی از بین نمی‌رود.

سه ورودی فیچر را بشناس:

| ورودی | کاربرد |
| --- | --- |
| `@/features/products` | خروجی عمومی UI و typeهایی که آن entry point صادر می‌کند |
| `@/features/products/server` | توابع و صفحه‌های فقط سروری؛ محافظت‌شده با `server-only` |
| `@/features/auth/contracts` | قرارداد مستقل از UI و کد خصوصی سرور |

خروجی هر فایل را بررسی کن؛ یک تابع تا وقتی export نشده، از entry point عمومی قابل دریافت نیست. ارتباط دو فیچر از ورودی عمومی انجام می‌شود. داخل همان فیچر، دسترسی به ماژول‌های داخلی مجاز است.

[قواعد ESLint](D:/Projects2/nrh_store_nextjs/eslint.config.mjs) این مرزها را تا حد زیادی enforce می‌کنند: `lib` و UI عمومی وابسته به فیچر نمی‌شوند؛ `app`، layout و Providerها نقش ترکیب‌کننده دارند. مثلاً `features/home` می‌تواند محصول را ترکیب کند، اما UI محصول نباید صفحه خانه را بشناسد.

**راه‌اندازی ریشه**

```text
app/layout.tsx
  └─ AppProviders
       └─ ReactQueryProvider
            └─ AuthProvider
                 └─ CartProvider
                      └─ Header + page + mobile navigation + Footer
```

[AppProviders](D:/Projects2/nrh_store_nextjs/providers/AppProviders.tsx) ترتیب وابستگی‌ها را مشخص می‌کند: احراز هویت به QueryClient و سبد به وضعیت ورود نیاز دارد. Provider سبد فقط وضعیت اعلان/سایدبار را نگه می‌دارد؛ خود سبد در Query است. QueryClient سرور برای هر فراخوانی ساخت نمونه جدا دارد و نمونه مرورگر مشترک است.

**هنگام افزودن قابلیت جدید**

اول قرارداد داده و مالک قابلیت را تعیین کن. سپس تابع سروری یا HTTP client، منطق hook، کامپوننت و Route را اضافه کن. داده خصوصی نزدیک محل مصرف بررسی مجوز می‌خواهد. حالت خالی و خطا را هم‌زمان با حالت موفق طراحی کن.

در این نسخه، `params` و `searchParams` بسیاری از Routeها Promise هستند و `cookies()` به‌صورت async مصرف می‌شود. قبل از کپی مثال‌های نسخه‌های دیگر، [مستندات نصب‌شده Next](D:/Projects2/nrh_store_nextjs/node_modules/next/dist/docs) را بخوان. مثال‌های Client Component در [راهنمای محلی](D:/Projects2/nrh_store_nextjs/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md) آمده‌اند.

**تمرین:** مسیر `/products` را از `app` تا `getProductCollection` دنبال کن. توضیح بده چرا Server Component مستقیماً تابع سروری را صدا می‌زند و به `/api/catalog` خودش HTTP نمی‌زند. سپس یک قابلیت فرضی «برندها» را فقط روی کاغذ بین Route، feature و `lib` تقسیم کن.

ادامه: [داده، API و کش](D:/Projects2/nrh_store_nextjs/docs/data-api-cache-fa.md).
