# تسویه داخل Next.js و انتقال مستقیم به سداد

نسخه رابط وردپرس: **۱٫۱٫۱**. ورود با Boom حفظ شده است. سبد مهمان با Cart-Token و سبد مشتری واردشده با کوکی معتبر وردپرس و nonce مستقل Store API کار می‌کند. این نسخه انتقال سبد، شروع پرداخت و پاک‌سازی سبد پرداخت‌شده را زیر قفل حساب مشترک قرار می‌دهد.

## رفتار پیاده‌سازی‌شده

مشتری باید وارد حساب شود. فرم آدرس، روش ارسال و مرور مبلغ در `/checkout` باقی می‌ماند. دکمه «پرداخت با سداد بانک ملی» درخواست نهایی را به BFF می‌فرستد. وردپرس از مسیر رسمی Store API سفارش را اعتبارسنجی و ایجاد می‌کند و رابط، با تنظیمات افزونه سداد موجود، توکن می‌گیرد. پاسخ شامل لینک مستقیم `https://sadad.shaparak.ir/VPG/Purchase?Token=...` است؛ صفحه `order-pay` نمایش داده نمی‌شود.

```text
Browser /checkout
  -> POST /api/cart/pay                 Next: identity, CSRF, snapshot, cart locks
  -> POST /wp-json/nrh/v1/checkout       WP: authenticated user, DB lock, idempotency
  -> internal POST /wc/store/v1/checkout Woo: validation, shipping, coupons, stock, order
  -> Store API payment context hook     WP: request Sadad token, save order binding
  <- { order_id, redirect_url }
Browser -> Sadad
Sadad -> POST /wp-json/nrh/v1/sadad/callback?order=...&key=...
  -> server-to-server Verify -> payment_complete()
  -> 303 /checkout/result?order=...
Browser -> Next /api/payments/:id -> WordPress ownership check / verified order status
```

WordPress منبع حقیقت سفارش و مبلغ است. Next هیچ مبلغ بانکی را از فرم مرورگر نمی‌پذیرد و `success=true` در URL اثری بر نتیجه ندارد. وضعیت «موفق» شروع پرداخت، به معنی پرداخت‌شدن سفارش نیست.

## نصب در محیط آزمایشی

1. افزونه ووکامرس و افزونه سداد فعلی با شناسه `melli_pay` فعال باشند. تنظیمات `merchant_id`، `terminal_id` و `terminal_key` در همان افزونه تکمیل شوند.
2. پوشه `wordpress/nrh-headless-checkout` یا ZIP خروجی `artifacts/payments/nrh-headless-checkout.zip` را نصب کنید.
3. در `wp-config.php` مبدأ فرانت را تنظیم کنید؛ بدون مسیر، query یا fragment:

   ```php
   define('NRH_HEADLESS_FRONTEND_URL', 'https://your-next-domain.example');
   ```

4. Next مانند قبل به `WP_API_URL` و `WP_AUTH_BASE_URL` واقعی وصل می‌شود. راز نشست Next با کلید بانک مستقل است. هیچ کلید بانکی در متغیرهای `NEXT_PUBLIC_*` قرار نمی‌گیرد.
5. callback وردپرس باید HTTPS باشد. HTTP فرانت فقط برای loopback و محیط غیرproduction مجاز است. درگاه واقعی به callback قابل دسترس نیاز دارد.
6. مسیرهای `/wp-json/nrh/v1/cart/merge`، `/wp-json/nrh/v1/checkout`، `/wp-json/nrh/v1/orders/*`، `/wp-json/nrh/v1/sadad/callback`، Store API سبد/تسویه و مسیرهای Next مربوط به auth/cart/payments را از LiteSpeed، CDN و کش صفحه مستثنا کنید. پارامتر تصادفی و `no-store` جای این تنظیم را نمی‌گیرند. مسیر عمومی موجود `/nrh/v1/filters` مشمول سیاست کش خصوصی این رابط نیست.
7. PHP حداقل 8.1 روی سیستم 64بیتی، OpenSSL با `des-ede3` و MySQL حداقل 5.7.5 یا MariaDB با پشتیبانی هم‌زمان چند `GET_LOCK` در یک connection لازم است. قفل DB غیرمسدودکننده است؛ در صورت اشغال، خطای کنترل‌شده برمی‌گردد. فایل قفل فعلی Next برای هماهنگی workerهای آن همچنان به دیسک مشترک نیاز دارد.

هیچ فایل افزونه سداد یا قالب Boom بازنویسی نشده است. رابط فقط پرداختی را که خودش از endpoint اختصاصی آغاز کرده در hook استاندارد Store API پردازش می‌کند. مسیر سنتی افزونه سداد خارج از این رابط تغییر نکرده است.

## قراردادها

| مسیر | احراز هویت / ورودی | خروجی |
| --- | --- | --- |
| `POST /api/cart/sync` | نشست معتبر Next و همان مبدأ؛ بدنه `{}` | سبد حساب پس از انتقال تأییدشده مهمان |
| `POST /nrh/v1/cart/merge` | کوکی واقعی WP، `X-WP-Nonce` و `guest_token` در بدنه؛ بدون هدر Cart-Token | `{ merged: true }` پس از ذخیره و بررسی مجدد |
| `POST /api/cart/pay` | نشست معتبر Next، همان مبدأ؛ `attempt_id`، SHA-256 snapshot و `expected_total` | شماره سفارش و لینک مجاز بانک یا صفحه نتیجه |
| `POST /nrh/v1/checkout` | کوکی واقعی WP، `X-WP-Nonce` و `Nonce` مخصوص Store API؛ ورودی بالا و آدرس‌های سبد از BFF | همان پاسخ حداقلی |
| `POST /nrh/v1/sadad/callback` | عمومی برای بانک؛ کلید تصادفی callback، توکن و شناسه تراکنش منطبق با متادیتای سفارش | Verify سروری و 303 به فرانت |
| `GET /nrh/v1/orders/:id` | کاربر واردشده، مالک همان سفارش | وضعیت، `paid` و مرجع تأییدشده؛ بدون اطلاعات هویتی/کلید بانک |
| `POST /nrh/v1/orders/:id` | همان مالک؛ بررسی دوباره حداکثر هر ۱۵ ثانیه | وضعیت تازه و پاک‌کردن فقط سبد تغییرنکرده سفارش پرداخت‌شده |
| `GET/POST /api/payments/:id` | BFF خصوصی؛ POST فقط با بدنه `{}` و همان مبدأ | وضعیت اعتبارسنجی‌شده وردپرس |

همه مسیرهای وردپرس جدول بالا پسوند `/wp-json` دارند. nonce و کوکی WordPress از پل امن احراز هویت فعلی دریافت می‌شوند؛ مرورگر به کلید بانکی یا cookie jar وردپرس دسترسی ندارد.

snapshot علاوه بر مبلغ، اقلام، تعداد، جمع ردیف‌ها، کوپن‌ها، هزینه‌ها، آدرس و ارسال انتخاب‌شده را پوشش می‌دهد. تغییر هرکدام، تأیید مجدد مشتری را لازم می‌کند. ووکامرس باز هم موجودی، آدرس و مبلغ را مستقلاً بررسی می‌کند. درخواست نهایی از سرور، آدرس‌های سبد تازه را ارسال می‌کند.

## تکرار، قطع ارتباط و بازگشت بانک

- شناسه UUID درخواست در فرم تا تغییر snapshot حفظ می‌شود. retry خودکار mutation و انتقال به آدرس دلخواه غیرفعال است.
- قفل کاربر در DB از تداخل callback و شروع پرداخت جلوگیری می‌کند. ثبت وضعیت قبل از تماس بانک انجام می‌شود. ثبت سفارش از CRUD ووکامرس استفاده می‌کند و با HPOS سازگار است.
- تکرار درخواست همان تلاش، همان لینک را برمی‌گرداند. UUID تازه نمی‌تواند پرداخت حل‌نشده قبلی همان حساب را دور بزند. اگر سبد تغییر کرده باشد، مشتری به نتیجه سفارش قبلی هدایت می‌شود، نه درگاه با مبلغ قدیمی.
- حداکثر ۵۰ رکورد تلاش برای هر مشتری نگهداری می‌شود. رکوردهای resolved/ready بیش از هفت روز در شروع درخواست جدید پاک‌سازی می‌شوند؛ وضعیت مبهمِ processing خودکار حذف نمی‌شود.
- timeout درخواست توکن یا Verify به معنی شکست قطعی پرداخت نیست. درخواست بانک تکرار خودکار نمی‌شود؛ وضعیت مبهم برای بررسی نگهداری می‌شود. اگر توکن دریافت نشده باشد، تطبیق دستی با بانک/پشتیبانی لازم است.
- callback به نشست مرورگر وابسته نیست. توکن، شناسه بانکی، کلید callback، مبلغ و ارز ذخیره‌شده بررسی می‌شوند. پاسخ Verify نیز باید شناسه تراکنش و مدارک رهگیری صحیح داشته باشد. اگر بانک Amount برگرداند، آن نیز تطبیق داده می‌شود.
- شواهد Verify قبل از `payment_complete()` ذخیره می‌شوند. callback تکراری سفارش پرداخت‌شده را دوباره پردازش نمی‌کند. کدهای مبهم و پایان مهلت تأیید، خودکار «پرداخت‌شده» یا «ناموفق قطعی» نمی‌شوند.
- مبلغ به‌صورت عدد صحیح ریال و تبدیل دقیق رشته اعشاری محاسبه می‌شود. بخش اعشاری نامعتبر، overflow یا ارز ناشناخته رد می‌شود. TLS بانک تأیید می‌شود، redirect HTTP دنبال نمی‌شود و timeout/اندازه پاسخ محدود است.
- نتیجه، با `is_paid()` ووکامرس نمایش داده می‌شود. GET بررسی وضعیت به بانک درخواست نمی‌زند و polling خودکار وجود ندارد. پس از پرداخت، فقط سبدی پاک می‌شود که hash آن با سفارش یکسان باشد؛ خرید تازه مشتری پاک نمی‌شود.

## سازگاری نشست Boom و انتقال سبد

علت خطای ثبت‌شده قبلی، ارسال Cart-Token در درخواست مشتری واردشده و انتخاب `StoreApi\SessionHandler` فاقد متد کوکی بود. نسخه ۱٫۱ برای مشتری واردشده Cart-Token نمی‌فرستد؛ نشست کلاسیک `WC_Session_Handler` به‌صورت استاندارد با کوکی‌های وردپرس شناسایی می‌شود. Next قبل از هر تغییر سبد، `GET /cart` می‌گیرد، هدر `User-ID` را با هویت تأییدشده تطبیق می‌دهد و `Nonce` تازه را روی درخواست تغییر/تسویه می‌گذارد. `X-WP-Nonce` برای احراز هویت REST وردپرس مستقل از `Nonce` ووکامرس است؛ هر دو حفظ می‌شوند. هیچ اعتبارسنجی nonce یا hook امنیتی Boom حذف نشده است.

پس از ورود، خواندن سبد مهمان غیرخالی باعث یک `POST /api/cart/sync` در کلاینت می‌شود. رابط وردپرس امضای توکن و مهمان‌بودن شناسه را بررسی می‌کند؛ توکن حساب حتی برای همان کاربر قابل واردکردن نیست. زیر قفل حساب و سبد مهمان، اقلام از نشست سروری ووکامرس خوانده و با `WC_Cart_Session` بازخوانی و محاسبه می‌شوند. اقلام با کلید متفاوت حفظ می‌شوند؛ برای کلید مشترک، تعداد آخر سبد مهمان جای تعداد قبلی را می‌گیرد، مطابق ادغام saved-cart ووکامرس. تعدادها جمع نمی‌شوند. داده سفارشی کالا/تنوع حفظ می‌شود؛ اطلاعات مشتری، آدرس و پیش‌نویس مهمان کپی نمی‌شوند. کوپن‌ها به ووکامرس سپرده می‌شوند و در checkout مجدداً اعتبارسنجی خواهند شد.

نشانه انتقال در همان ردیف نشست حساب ذخیره و دوباره خوانده می‌شود. سپس نشست مهمان بازنشسته می‌شود. retry پس از پاسخ گم‌شده، تعدادهای قبلی را دوباره اعمال نمی‌کند؛ کوکی مهمان فقط پس از خواندن سبد حساب در Next حذف می‌شود. در خطا، سبد همراه پیام و امکان تازه‌سازی قابل مشاهده است. این endpoint جای حدس‌زدن قرارداد رمزگذاری‌شده Boom را می‌گیرد؛ ورود، ثبت‌نام، پیامک و بازیابی فعلی Boom تغییر نکرده‌اند.

نصب نسخه ۱٫۱ رابط روی وردپرس لازم است؛ صرف اجرای کد جدید Next انتقال سبد را روی سرور ایجاد نمی‌کند. سورس رمزگذاری‌شده Boom تغییر نکرده و سازگاری نهایی آن با این مسیر باید روی نسخه نصب‌شده آزمایش شود.

## محدودیت آزمون زنده

پروتکل سداد و نام فیلدها از کد ارسالی افزونه نصب‌شده نسخه 1.3 استخراج شده‌اند. نصب روی وردپرس واقعی، تست با دیتابیس واقعی، callback از سداد و یک خرید تأییدشده هنوز معیار پذیرش انتشار هستند. صرف پاس‌شدن تست‌های کنترل‌شده، تأیید کارایی دیتابیس هاست یا پذیرندگی بانکی نیست.

## آزمون‌های قابل تکرار

```sh
npm run test:payments
npm run test:payments:wordpress
npm run test:payments:performance
npm run test:payments:browser
npm run typecheck
npm run lint
npm run build
```

در صورت نبود PHP در PATH، متغیر `PHP_BINARY` را به مسیر executable بدهید. لانچر ویندوز مسیر استاندارد XAMPP را هم شناسایی می‌کند. تست مرورگر به Playwright و سرور Next روی `PAYMENTS_TEST_URL`، پیش‌فرض `http://localhost:4107` نیاز دارد. `PLAYWRIGHT_MODULE` مسیر runtime و `PLAYWRIGHT_CHANNEL` مرورگر را مشخص می‌کنند. بانک و APIهای تراکنشی در تست مرورگر intercept می‌شوند؛ پرداخت واقعی انجام نمی‌شود.

تست PHP از doubles حافظه‌ای WordPress/WooCommerce استفاده می‌کند و دو مجموعه پرداخت و انتقال سبد دارد. برای جلوگیری از ساده‌سازی اشتباه فرمت ذخیره‌سازی، تست انتقال سبد از کلاس اصلی و بدون تغییر `WC_Session` نسخه 10.7.0 استفاده می‌کند؛ serialization تو‌در‌توی نشست نیز بررسی می‌شود. این fixture فقط در تست است و در ZIP نصب قرار نمی‌گیرد. تست Node انتقال واقعی handlerها را با upstream کنترل‌شده اجرا می‌کند. سنجش CPU شامل snapshot/hash یک سبد ۲۰۰ردیفی با ۲۰۰۰ نمونه است و p95 باید زیر بودجه ۲۵ms بماند. آزمون هم‌زمانی، شش درخواست یک حساب را سری می‌کند. آزمون تکرار PHP تأیید می‌کند ۱۰۰ تکرار، تماس تازه بانک یا تغییر دوباره تعداد پس از انتقال سبد ایجاد نمی‌کند. این اندازه‌گیری‌ها شامل تأخیر بانک، دیتابیس یا ظرفیت هاست production نیستند.

گزارش‌ها و اسکرین‌شات‌ها در `artifacts/payments` ذخیره می‌شوند. تست‌های قدیمی auth/cart/catalog و قفل چندپردازشی هم برای جلوگیری از regression اجرا می‌شوند. تست مرورگر live قدیمی سبد، دیگر دکمه پرداخت واقعی را کلیک نمی‌کند.

## مبنای مستندات

- راهنمای نصب‌شده Next 16.4.2: مستندات Route Handler در `node_modules/next/dist/docs`، راهنمای authentication و قرارداد async پارامترهای page.
- [WooCommerce Checkout API](https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/checkout/)
- [WooCommerce Nonce Tokens](https://developer.woocommerce.com/docs/apis/store-api/nonce-tokens/)
- [WooCommerce Cart Tokens برای نشست مهمان](https://developer.woocommerce.com/docs/apis/store-api/cart-tokens/)
- [WC_Cart_Session و رفتار ادغام saved-cart](https://woocommerce.github.io/code-reference/files/woocommerce-includes-class-wc-cart-session.html)
- [احراز هویت cookie و nonce وردپرس](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/)
- [پردازش پرداخت از hook استاندارد Store API](https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks/checkout-payment-methods/payment-method-integration/)
- [WordPress Custom Endpoints و permission_callback](https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/)
- [WordPress HTTP API](https://developer.wordpress.org/reference/functions/wp_remote_post/)
