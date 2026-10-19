# مسیر یادگیری کامل پروژه

این پوشه، راهنماهای فارسی پروژه را به تفکیک موضوع جمع می‌کند. مبنا کد موجود در **۲۰۲۶/۱۰/۱۹** و Next.js نصب‌شده `16.2.12` است. «پیاده‌سازی شده»، «نمایشی» و «کار باقی‌مانده» در هر راهنما جدا توضیح داده شده‌اند؛ وجود یک کامپوننت یا endpoint به معنی کامل‌بودن قابلیت نیست.

**ترتیب پیشنهادی مطالعه**

| مرحله | راهنما | پس از مطالعه چه چیزی را می‌فهمی؟ |
| --- | --- | --- |
| ۱ | [معماری و ساختار](D:/Projects2/nrh_store_nextjs/docs/architecture-learning-fa.md) | مرز فیچرها، سرور/کلاینت، Routeها و Providerها |
| ۲ | [داده، API و کش](D:/Projects2/nrh_store_nextjs/docs/data-api-cache-fa.md) | مسیر درخواست، BFF، Query، خطا و وبهوک |
| ۳ | [محصولات](D:/Projects2/nrh_store_nextjs/docs/products-learning-fa.md) | کاتالوگ، جزئیات، تنوع، گالری و داده واقعی |
| ۴ | [دسته‌بندی‌ها](D:/Projects2/nrh_store_nextjs/docs/categories-learning-fa.md) | درخت دسته، مگامنو، breadcrumb و صفحه‌بندی |
| ۵ | [جست‌وجو](D:/Projects2/nrh_store_nextjs/docs/search-learning-fa.md) | debounce، کش نتیجه و رابط دسکتاپ/موبایل |
| ۶ | [ورود و نشست مشتری](D:/Projects2/nrh_store_nextjs/docs/auth-learning-fa.md) | رمز، OTP، بازیابی، کوکی و مجوز سروری |
| ۷ | [حساب کاربری](D:/Projects2/nrh_store_nextjs/docs/account-learning-fa.md) | محافظت داشبورد و مرز قابلیت‌های فعلی |
| ۸ | [سبد خرید](D:/Projects2/nrh_store_nextjs/docs/cart-learning-fa.md) | عملیات سبد، منبع حقیقت و همگام‌سازی UI |
| ۹ | [تسویه‌حساب](D:/Projects2/nrh_store_nextjs/docs/checkout-learning-fa.md) | آدرس، ارسال، پیش‌نویس و مراحل باقی‌مانده پرداخت |
| ۱۰ | [مدیریت بنرها](D:/Projects2/nrh_store_nextjs/docs/banners-learning-fa.md) | پنل مستقل، آپلود، انتشار و ذخیره فایل |
| ۱۱ | [خانه و چیدمان](D:/Projects2/nrh_store_nextjs/docs/home-layout-learning-fa.md) | ترکیب فیچرها، Suspense و ناوبری موبایل |
| ۱۲ | [رابط کاربری و تعامل](D:/Projects2/nrh_store_nextjs/docs/ui-interactions-fa.md) | فونت، RTL، دیالوگ، carousel، زوم و انیمیشن |
| ۱۳ | [سئو و مسیرها](D:/Projects2/nrh_store_nextjs/docs/seo-routing-fa.md) | canonical، metadata، sitemap، robots و schema |
| ۱۴ | [تست، عیب‌یابی و استقرار](D:/Projects2/nrh_store_nextjs/docs/testing-deployment-fa.md) | اجرای بررسی‌ها، تنظیم محیط و محدودیت‌های انتشار |
| ۱۵ | [راه‌اندازی و آمادگی production](D:/Projects2/nrh_store_nextjs/docs/production-readiness-fa.md) | نصب روی دستگاه تازه، کلید ثابت، بررسی اتصال و شواهد OTP و سبد واقعی |

**چطور بخوانم که بتوانم دوباره بسازم؟**

برای یادگیری هم‌زمانی، [ایرادهای اولیه](D:/Projects2/nrh_store_nextjs/docs/race-condition-audit-fa.md) و سپس [اصلاحات و بازآزمایی](D:/Projects2/nrh_store_nextjs/docs/race-condition-fixes-fa.md) را بخوان؛ گزارش اولیه شاهدِ قبل از اصلاح است.

برای هر موضوع، ابتدا جریان را بخوان و سپس فایل‌های معرفی‌شده را به همان ترتیب باز کن. در پایان، تمرین راهنما را روی محیط توسعه انجام بده. برای خودت توضیح بده: «چه رویدادی شروع کار است؟ داده از کجا می‌آید؟ چه کسی اجازه تغییر دارد؟ در شکست چه اتفاقی می‌افتد؟»

سه مسیر را یک بار کامل دنبال کن:

1. بازکردن محصول: Route → تابع سروری → ووکامرس → صفحه و metadata.
2. ورود: فرم → اکشن → API داخلی → adapter وردپرس → کوکی → UI نشست.
3. خرید: انتخاب تنوع → mutation → ووکامرس → کش مشترک → سایدبار → checkout.

**واژه‌های پایه**

| واژه | معنی در این پروژه |
| --- | --- |
| Headless | Next رابط فروشگاه را می‌سازد؛ وردپرس مدیریت محتوا و ووکامرس منطق فروش را دارد |
| BFF | API سروری مخصوص فرانت که ورودی و نشست را کنترل می‌کند |
| Query / Mutation | خواندن داده / درخواست تغییر داده |
| DTO / Contract | شکل مجاز داده‌ای که بین دو لایه ردوبدل می‌شود |
| Hydration | فعال‌شدن تعامل React روی HTML اولیه |
| DAL | لایه دسترسی داده که هویت را نزدیک داده خصوصی بررسی می‌کند |
| Invalidation | اعلام قدیمی‌شدن داده برای دریافت دوباره |

**محدوده واقعی پروژه**

هشت فیچر `auth`، `account`، `products`، `categories`، `search`، `cart`، `banners` و `home` راهنمای فارسی دارند. پرداخت نهایی، ادغام سبد با حساب و رفع ناسازگاری PHP checkout هنوز کار باقی‌مانده‌اند. داشبورد فعلی سفارش‌ها را دریافت نمی‌کند. بلاگ و پرسش‌های متداول نیز با وجود بعضی لینک‌ها، Route کامل ندارند.

فایل‌های `architecture.md` و `headless-wordpress.md` و گزارش‌های داخل READMEها سابقه تصمیم‌ها را نگه می‌دارند؛ بعضی نتایج آزمونشان تاریخی است. برای وضعیت فعلی، کد و راهنماهای فارسی بالا را با هم بخوان. ساخت این مجموعه، اجرای تازه تست‌های برنامه یا تغییر تنظیمات سایت زنده نیست. لینک‌های فایل‌ها برای مسیر فعلی دستگاه نوشته شده‌اند.
