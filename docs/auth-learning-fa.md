# ورود، ثبت‌نام، بازیابی رمز و نشست مشتری

این فیچر رابط فارسی ورود را در Next نگه می‌دارد و هویت واقعی را از افزونه Boom وردپرس می‌گیرد. ورود مدیر بنرها سیستم دیگری است. صرف داشتن `user` در مرورگر یا وجود کوکی، اثبات مجوز دسترسی به داده خصوصی نیست.

**سه لایه مستقل را بشناس**

| لایه | کار |
| --- | --- |
| فرم و جریان رابط | کدام مرحله باز است، خطای فیلد چیست و دکمه مشغول است یا نه |
| API داخلی Next | اعتبارسنجی، محدودسازی، نگهداری امن نشست و پاسخ قابل اعتماد |
| adapter وردپرس | تبدیل قرارداد فرانت به Boom، مدیریت کوکی/nonce و بررسی هویت واقعی |

دو store در Zustand داریم: `auth-flow.store` برای مودال و مراحل، و `auth-session.store` برای DTO کاربر و وضعیت `unknown`، `authenticated` یا `unauthenticated`. رمز، OTP و credential وردپرس در این storeها persist نمی‌شوند. وضعیت `unknown` جلوی فعال‌شدن زودهنگام ورود یا سبد پیش از بازیابی نشست را می‌گیرد.

**مسیر فرم‌ها**

```text
phone: شناسه ورود، موبایل یا ایمیل یا نام کاربری
  → password → success
  → otp → success
  → register → success
  → recovery → reset-password → password
```

نام مرحله `phone` به معنی وجود endpoint تشخیص شماره نیست. ثبت‌نام انتخاب صریح کاربر است. `AuthFlow` مرحله را به کامپوننت فرم نگاشت می‌کند؛ منطق درخواست در [use-auth-actions.ts](D:/Projects2/nrh_store_nextjs/features/auth/hooks/use-auth-actions.ts) است. `perform` جلوی ارسال هم‌زمان عملیات فرم را می‌گیرد. React Hook Form و schemaها، خطاهای فیلد را مدیریت می‌کنند؛ سرور دوباره ورودی را بررسی می‌کند.

**قرارداد درخواست‌ها**

مرورگر `/api/auth` و سرور namespace واقعی `/wp-json/boom/v1` را استفاده می‌کند. همه ردیف‌ها جز session از مرورگر `POST` هستند.

| API داخلی | ورودی اصلی فرانت | تفاوت یا کاربرد سمت Boom |
| --- | --- | --- |
| `/send-otp` | `phone, purpose` | ارسال `{phone}`؛ purpose در کنترل جریان/سیاست Next مصرف می‌شود |
| `/verify-otp` | `phone, code` | تبدیل `code` به `otp`؛ ورود پیامکی |
| `/login` | `identifier, password` | تبدیل identifier به `username` |
| `/register` | `firstName, lastName, phone, email, password` | ترکیب نام‌ها در `name`؛ ایمیل لازم است |
| `/reset-password` | `phone, code, password` | ارسال OTP همراه رمز جدید |
| `/forgot-password-email` | `email` | درخواست کد بازیابی ایمیلی |
| `/reset-password-email` | `email, code, password` | مصرف کد ایمیلی همراه رمز جدید |
| `GET /session` | کوکی همان مبدأ | بررسی نشست محلی و `/me` وردپرس، بدون پاک‌کردن یا نوشتن کوکی مرورگر |
| `/logout` | کوکی همان مبدأ | ابطال محلی و درخواست خروج از وردپرس |

`sync-session` و `/me` را سرور صدا می‌زند؛ برایشان Route مستقیم عمومیِ متناظر نساخته‌ایم. قراردادهای این افزونه را به وردپرس خام یا فروشگاه دیگر تعمیم نده.

**بعد از ورود موفق چه می‌شود؟**

1. وردپرس پاسخ ورود و کوکی‌های لازم را برمی‌گرداند.
2. client سروری nonce احراز هویت REST را با کوکی معتبر از `admin-ajax.php?action=rest-nonce` می‌گیرد و در `X-WP-Nonce` می‌فرستد؛ nonce منقضی یک بار تمدید می‌شود.
3. adapter، `sync-session` و سپس `/me` را بررسی می‌کند. پاسخ ظاهراً موفق بدون کوکی یا شناسه معتبر، نشست نمی‌سازد.
4. Next اطلاعات نشست را رمزنگاری و در کوکی `HttpOnly` با `SameSite=Lax` و در production با `Secure` می‌گذارد. JSON پاسخ فقط DTO مجاز کاربر را دارد.
5. مرورگر وضعیت نشست را تغییر می‌دهد، QueryClient را پاک می‌کند و از طریق `nrh-auth` خبر تغییر هویت می‌دهد.
6. `AuthModal` پس از حدود ۱٫۶ ثانیه بسته می‌شود؛ مقصد معتبر داخلی باز یا رندر سرور refresh می‌شود. هدایت به وردپرس انجام نمی‌شود.

[cookies.ts](D:/Projects2/nrh_store_nextjs/features/auth/server/cookies.ts) از AES-256-GCM، IV تصادفی، expiry و شناسه محلی نشست استفاده می‌کند. رمزنگاری، با پنهان‌کردن داده در Base64 تفاوت دارد. تغییر secret نشست‌های قبلی را نامعتبر می‌کند. raw cookie، رمز و کد را وارد لاگ یا متغیر `NEXT_PUBLIC_` نکن.

**بازیابی رمز با ورود پیامکی فرق دارد**

در این سایت OTP پیامکی چهاررقمی و کد ایمیل شش‌رقمی است. ارقام فارسی/عربی و قالب موبایل ایران normalize می‌شوند. کد بازیابی پیامکی باید مستقیم همراه رمز جدید به reset برسد؛ فراخوانی verify قبل از آن، کد را مصرف و کاربر را وارد می‌کند. پیام درخواست بازیابی ایمیل تا حد ممکن وجود یا نبود حساب را افشا نمی‌کند. شمارش‌معکوس رابط کمک UX است؛ محدودیت معتبر روی سرور اعمال می‌شود.

**بازیابی نشست، خروج و دسترسی خصوصی**

[AuthProvider](D:/Projects2/nrh_store_nextjs/features/auth/components/AuthProvider.tsx) هنگام شروع، focus، visibility و هر ۶۰ ثانیه نشست را بررسی می‌کند. شماره درخواست و snapshot وضعیت مانع اعمال پاسخ دیررس بر ورود/خروج جدید می‌شوند. وضعیت مرورگر برای نمایش است؛ [DAL](D:/Projects2/nrh_store_nextjs/features/auth/server/dal.ts) ابطال محلی و هویت backend را نزدیک داده خصوصی بررسی می‌کند. Proxy فقط نبودن کوکی را سریع تشخیص می‌دهد.

خروج ابتدا شناسه نشست را در `data/auth/revoked` با expiry ثبت می‌کند. این کار به‌دلیل رفتار خروج افزونه در آزمون قبلی لازم شد. replay کوکی قدیمی هم با همان شناسه رد می‌شود. اگر ذخیره ابطال شکست بخورد، خروج موفق گزارش نمی‌شود؛ اگر صرفاً درخواست خروج وردپرس شکست بخورد، ابطال محلی معتبر می‌ماند. داده ابطال باید روی دیسک پایدار بماند.

**مرز امنیت و محدودیت فعلی**

ورودی JSON احراز هویت سقف ۸ KiB و schema سخت‌گیرانه دارد. origin، تعداد تلاش و محدودیت حساب/IP بررسی می‌شود؛ پاسخ خصوصی `no-store` است و `nextPath` فقط مسیر امن داخلی می‌پذیرد. تنظیم limiter حافظه‌ای برای چند instance کافی نیست. backend عمومی وردپرس هم به حفاظت مستقل نیاز دارد.

ارسال واقعی ایمیل بازیابی و reset نهایی همه مسیرها تأیید زنده کامل ندارند. همین‌طور `sync-session` به معنی ادغام کامل سبد مهمان نیست؛ PHP ادغام هنوز در دسترس نیست. این‌ها محدودیت ثبت‌شده‌اند، نه نتیجه اجرای تازه این مستند.

**مسیر مطالعه و تمرین**

[AuthFlow](D:/Projects2/nrh_store_nextjs/features/auth/components/AuthFlow.tsx) → [actions](D:/Projects2/nrh_store_nextjs/features/auth/hooks/use-auth-actions.ts) → [auth.api](D:/Projects2/nrh_store_nextjs/features/auth/api/auth.api.ts) → [route-handler](D:/Projects2/nrh_store_nextjs/features/auth/server/route-handler.ts) → [adapter](D:/Projects2/nrh_store_nextjs/features/auth/server/backend/adapter.ts).

با خواندن تست‌ها توضیح بده چرا کوکی جعل‌شده، پاسخ موفق بدون user معتبر و snapshot قدیمی نباید ورود ایجاد کنند. `npm run test:auth` و `npm run test:providers:browser` مسیرهای قراردادی و هم‌زمانی را بررسی می‌کنند. تنظیمات و محدودیت آزمون زنده در [README فنی احراز هویت](D:/Projects2/nrh_store_nextjs/features/auth/README.md) آمده است.
