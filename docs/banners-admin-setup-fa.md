# راه‌اندازی قابل انتقال ورود مدیر بنرها

## دستگاه توسعهٔ تازه

پیش‌نیاز Node.js حداقل `20.19.0` است. پس از clone، بدون کپی credentials لپ‌تاپ دیگر اجرا کن:

```sh
npm ci
npm run dev
```

صفحهٔ `http://localhost:3000/banners-admin/login`:

| نام کاربری پیش‌فرض توسعه | رمز پیش‌فرض توسعه |
| --- | --- |
| `admin` | `BannersDev123!` |

`predev` تنظیمات خالی را در `.env.local` ایجاد می‌کند؛ رمز توسعه از قبل مشخص است و هر بار عوض نمی‌شود. کلید امضای نشست بنر و کلید نشست مشتری جداگانه و فقط یک بار تولید می‌شوند. این فایل خصوصی در Git قرار نمی‌گیرد و هیچ مقداری به سخت‌افزار، نام کاربر ویندوز یا مسیر لپ‌تاپ اولیه وابسته نیست.

برای تکمیل تنظیمات بدون اجرای وب‌سرور، `npm run setup:env` را بزن. مقدار غیرخالی از فایل یا محیط اجرا حفظ می‌شود؛ اگر نامعتبر باشد با نام همان متغیر خطا می‌گیری. setup روی فایل قفل می‌گیرد، تنظیمات کامل را پیش از نوشتن بررسی می‌کند و تغییر را اتمیک ثبت می‌کند.

`npm run dev` پیش‌فرض به `127.0.0.1` متصل می‌شود. برای دسترسی شبکهٔ محلی، ابتدا credentials خصوصی خودت را تنظیم و سپس آگاهانه `npm run dev -- --hostname 0.0.0.0` را اجرا کن. حساب عمومی توسعه برای سرویس در دسترس دیگران مناسب نیست.

## build و production دو مرحلهٔ جدا هستند

```sh
npm run build
npm run start
```

`build` فقط کامپایل می‌کند؛ فرم ورود را برای کاربر اجرا نمی‌کند. این مرحله secret تولید نمی‌کند و به فایل خصوصی لپ‌تاپ توسعه وابسته نیست. بررسی runtime در `prestart` و `instrumentation.ts` پیش از آماده‌شدن سرور انجام می‌شود؛ تنظیم ناقص با نام متغیر مشخص رد می‌شود.

حساب عمومی `BannersDev123!` در production پذیرفته نمی‌شود، حتی اگر production را محلی با `next start` آزمایش کنی. برای این حالت، متغیرهای خصوصی را روی میزبان یا در فایل ignored به نام `.env.production.local` تنظیم کن؛ این فایل از `.env.local` توسعه اولویت بیشتری دارد.

```dotenv
BANNERS_ADMIN_USERNAME=<your-private-admin-name>
BANNERS_ADMIN_PASSWORD=<your-private-password-of-at-least-8-characters>
BANNERS_ADMIN_SESSION_SECRET=<persistent-random-secret-at-least-32-characters>
AUTH_SESSION_SECRET=<another-persistent-random-secret-at-least-32-characters>
NEXT_PUBLIC_SITE_URL=https://your-frontend.example
WP_API_URL=https://your-wordpress.example/wp-json
WP_AUTH_BASE_URL=https://your-wordpress.example/wp-json
WP_AUTH_NAMESPACE=boom/v1
```

عبارت‌های داخل `<...>` نمونه‌اند و باید با مقدار واقعی جایگزین شوند. برای هر secret این فرمان را جداگانه و در محیط خصوصی اجرا کن:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

رمز پنل بین ۸ تا ۲۵۶ کاراکتر است. اگر در env فایل از `$` استفاده می‌کنی، طبق قواعد Next آن را به شکل `\$` بنویس؛ برای تنظیم مستقیم در پنل میزبان، قواعد quoting همان میزبان را رعایت کن. نام کاربری نباید فاصلهٔ ابتدا/انتها یا کاراکتر کنترلی داشته باشد.

برای preview محلی production، مقدار `NEXT_PUBLIC_SITE_URL=http://localhost:3000` مجاز است؛ رمز همچنان باید خصوصی باشد و کوکی production همچنان `Secure` می‌ماند. برای سرویس عمومی HTTPS لازم است. WordPress API نیز در production باید HTTPS باشد.

## محل اجرا و ذخیره‌سازی

مسیر پیش‌فرض داده‌ها نسبت به ریشهٔ پروژه تعیین می‌شود: `data/auth`، `data/cart-locks` و `data/banners`. روی میزبان می‌توان `AUTH_SESSION_DATA_DIR`، `CART_LOCK_DIR` و `BANNERS_DATA_DIR` را به مسیر پایدار و قابل نوشتن همان سرور تنظیم کرد. مسیر خاص لپ‌تاپ در تنظیمات پیش‌فرض وجود ندارد.

در استقرار چند worker، secretهای همان نصب و فایل‌های بنر باید مشترک و پایدار باشند. limiter ورود در وضعیت فعلی حافظه‌ای است؛ برای چند instance مستقل به limiter مشترک نیاز دارد. تنظیم این بخش، تأیید عمومی همهٔ سناریوهای serverless یا چند سرور نیست.

## تشخیص خطای تنظیمات

| نشانه | اقدام |
| --- | --- |
| فرم ورود غیرفعال است | پروژهٔ تازه را با `npm run dev` اجرا کن؛ اجرای مستقیم `next dev`، predev را اجرا نمی‌کند. برای تکمیل تنظیمات `npm run setup:env` بزن. |
| preflight نام متغیر را نشان می‌دهد | همان متغیر را اصلاح کن؛ مقدار خصوصی آن عمداً در پیام خطا چاپ نمی‌شود. |
| production رمز توسعه را رد می‌کند | یک رمز خصوصی در متغیر محیطی میزبان یا `.env.production.local` قرار بده. |
| مقدار فایل اعمال نشده | اولویت `process.env`، سپس `.env.production.local` یا `.env.development.local` و بعد `.env.local` را بررسی و فرایند را restart کن. |
| پشت HTTPS proxy خطای origin می‌بینی | `NEXT_PUBLIC_SITE_URL` را برابر origin واقعی فرانت بگذار؛ forwarded host دلخواه مرجع اعتبارسنجی نیست. |

کنترل origin احراز هویت، مقدار زمان اجرای سرور را می‌خواند و به مقدار لپ‌تاپ build وابسته نیست. برای metadata، URLهای عمومی و سئو همچنان origin عمومی درست را پیش از build تنظیم کن؛ تنظیمات عمومی رابط قواعد build-time خود Next را دارند.

## بررسی

```sh
npm run test:environment
npm run test:banners:auth
npm run test:banners:portability
```

آزمون آخر به Playwright و Edge نیاز دارد؛ `BANNERS_PLAYWRIGHT_MODULE` مسیر نصب Playwright را می‌پذیرد. تست‌ها از تنظیمات مستقل آزمایشی استفاده می‌کنند؛ رمز شخصی لپ‌تاپ اولیه، SMS و انتشار بنر واقعی وارد این آزمون نمی‌شوند.
