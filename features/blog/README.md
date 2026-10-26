# بلاگ نوین رایانه

فیچر مستقل `blog` مالک داده، نمایش مقاله و دیدگاه‌هاست. انتشار، ویرایش، دسته‌بندی و تأیید دیدگاه همچنان در WordPress انجام می‌شود. مسیرهای `app` نازک‌اند؛ خانه از ورودی `@/features/blog/server` استفاده می‌کند. React Query فقط دیدگاه‌های تعاملی را می‌خواند و HTML مقاله در Server Component رندر می‌شود.

نسخهٔ Node باید حداقل `20.19.0` باشد؛ این حداقل در `package.json` نیز اعلام شده است، چون نسخهٔ فعلی parser HTML این حداقل را نیاز دارد. بررسی حاضر با Node `22.17.0` اجرا شد.

## مسیرها

- `/blog`: آرشیو با ۹ کارت در صفحه، مرتب از جدید به قدیم.
- `/blog?q=...&category=22&page=2`: جست‌وجو و فیلتر قابل اشتراک؛ تغییر فیلتر به صفحه اول برمی‌گردد.
- `/blog/[slug]`: مقاله، تصویر بزرگ، تاریخ، نویسنده، دسته‌بندی، زمان تقریبی مطالعه، فهرست تیترها، اشتراک لینک، برچسب‌ها، مطالب مرتبط و دیدگاه‌ها.
- `/blog/category/[slug]`: لینک دسته‌بندی قدیمی WordPress را به آرشیو canonical همان دسته هدایت می‌کند و page/q را حفظ می‌کند.
- `/api/blog/[postId]/comments`: خواندن دیدگاه‌های عمومی و `POST` فقط برای مشتری واردشده.

متغیر تازه‌ای لازم نیست؛ REST root از `WP_API_URL` و fallback فعلی `lib/wordpress/config.ts` می‌آید. این آدرس root وردپرس است، مانند `https://nrhstore.ir/wp-json`.

## قراردادهای کشف‌شده از REST index واقعی در ۲۰۲۶/۱۰/۲۶

| endpoint                                                       | کاربرد و وضعیت استفاده                                                                                                            |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `GET /wp/v2/posts`                                             | فهرست، جست‌وجو، category، صفحه‌بندی، تاریخ میلادی و اطلاعات embedded نویسنده/تصویر/term. `_fields` و `_embed` محدودند.            |
| `GET /wp/v2/posts/{id}`                                        | بررسی تازهٔ نوع post، انتشار عمومی، حفاظت با رمز و بازبودن نظرات، پیش از ارسال دیدگاه.                                            |
| `GET /boom/v1/blog/post/{slug}`                                | HTML کامل، نویسنده، دسته‌بندی، tags و `related_posts`. شناسه و slug باید با Core برابر باشند.                                     |
| `GET /boom/v1/blog/categories`                                 | دسته‌های واقعی بلاگ؛ فقط موارد غیرخالی به UI می‌روند.                                                                             |
| `GET /boom/v1/blog/category/{slug}?page=1&per_page=9`          | کشف و بررسی شد؛ خلاصه‌هایش نویسنده و تاریخ ISO ندارند. برای UI کامل، فیلتر آرشیو از Core posts استفاده می‌کند.                    |
| `GET /wp/v2/categories`, `/tags`, `/users/{id}`, `/media/{id}` | منابع پشتیبان استاندارد؛ اطلاعات لازم با `_embed` یکجا دریافت می‌شود تا درخواست N+1 ایجاد نشود.                                   |
| `GET /wp/v2/comments?post={id}`                                | فقط دیدگاه‌های تأییدشده و اطلاعات عمومی؛ صفحه‌بندی ۶ موردی؛ بدون ایمیل، IP، متا یا credential.                                    |
| `POST /wp/v2/comments`                                         | با cookie و nonce واقعی کاربر؛ هویت از نشست سرور تأمین می‌شود. تنظیم تأیید خودکار/مدیریتی متعلق به WordPress است.                 |
| `/boom/v1/comments`                                            | GET و POST در index موجودند، اما body قرارداد POST در index اعلام نشده؛ قرارداد ناشناخته حدس زده نشده و Core رسمی استفاده می‌شود. |

جزئیات Boom تاریخ‌های شمسی مانند `1404-09-29T...` را به اسم `date_gmt` نیز برمی‌گرداند. این‌ها نباید وارد `new Date()` شوند. تاریخ انتشار/ویرایش همیشه از `wp/v2/posts` گرفته، به ISO میلادی تبدیل و فقط برای نمایش با `Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran' })` شمسی می‌شود. نام نویسنده بدون جایگزین ساختگی از WordPress می‌آید؛ اگر در مدیریت «admin» باشد، همان نمایش داده می‌شود.

## امنیت و عملکرد

- خواندن‌های عمومی فقط سروری، بدون cookie مشتری و با cache پنج دقیقه و tag مستقل `blog` هستند. تغییر محتوا در مراجعه بعد از TTL بازاعتبارسنجی می‌شود؛ webhook جدید لازم نیست.
- خواندن و نوشتن دیدگاه `no-store` هستند؛ پاسخ‌های خصوصی دارای نشانهٔ shared cache رد می‌شوند. فهرست و جزئیات عمومی به auth وابسته نیستند.
- فقط محتوای `publish` و `post` و بدون password protection نمایش داده می‌شود. هویت و وضعیت Core بر پاسخ Boom اولویت دارد. خطای شبکه با نبود مقاله یکی گرفته نمی‌شود.
- HTML توسط `sanitize-html` روی سرور با allowlist پاک می‌شود؛ script، iframe، handlerهای رویداد، CSS وردپرس و SVG اجرایی وارد سایت نمی‌شوند. پاراگراف، heading، جدول، فهرست، تصویر، caption، quote، code و audio/video بومی حفظ می‌شوند. embedهای iframe نیاز به سیاست allowlist جداگانه دارند.
- تنها URLهای تصویر شاخص از uploads دامنه CMS مجاز هستند؛ fallback بصری برای تصویر غایب وجود دارد. تصاویر شاخص با Next Image و اندازه‌های responsive؛ تصاویر داخل بدنه با lazy loading؛ carousel با Embla RTL و بدون autoplay.
- متن HTML صرفاً پس از پاک‌سازی در `dangerouslySetInnerHTML` قرار می‌گیرد. headings شناسهٔ مستقل می‌گیرند و anchorهای داخلی متن بازنویسی می‌شوند.
- JSON پاسخ حداکثر ۲ MiB و timeout شبکه ۱۲ ثانیه است. خطاها خام به مرورگر فرستاده نمی‌شوند.
- ثبت نظر: بررسی Origin و Fetch Metadata، schema strict، body محدود، rate limit حساب/IP، post عمومی و باز، هویت از `getCartAuthContext` (پل عمومی auth موجود)، nonce جدا و escape متن. `author/status/email` قابل ارسال از مرورگر نیستند. هیچ secret عمومی اضافه نشده است.
- POST خودکار retry نمی‌شود. شناسهٔ idempotency درخواست‌های هم‌زمان را ادغام و نتیجه را ده دقیقه در همان process حفظ می‌کند؛ در timeout نتیجه ممکن است نامعلوم باشد و UI پیش از ارسال مجدد بررسی نظرات را توصیه می‌کند. برای چند instance، idempotency و rate limit باید store مشترک داشته باشند؛ header IP نیز باید در reverse proxy بازنویسی شود.
- sitemap شامل آرشیو و مقاله‌های عمومی است؛ جزئیات دارای canonical، Open Graph Article و BlogPosting/Breadcrumb JSON-LD هستند. جست‌وجو noindex است.
- خواندن sitemap فقط slug، وضعیت حفاظت و زمان ویرایش را درخواست می‌کند؛ HTML کامل و داده embedded مقاله برای sitemap دانلود نمی‌شوند.
- صفحات بلاگ از انیمیشن ورود `PageTransition` مستثنا هستند؛ متن SSR پیش از hydration مخفی نمی‌شود و فرم دیدگاه دوبار mount نمی‌شود. طبق قرارداد Next، `notFound()` بعد از شروع streaming ممکن است HTTP ۲۰۰ با UI نبود مقاله و meta `noindex` برگرداند؛ تست وضعیت معنایی صفحه و noindex را بررسی می‌کند.

## بررسی

```sh
npm run test:blog
npm run typecheck
npm run lint
# با Playwright در دسترس و dev server روی پورت 3116:
npm run test:blog:browser
```

برای Playwright بیرون پروژه، `PLAYWRIGHT_MODULE` را روی مسیر آن تنظیم کن؛ `BLOG_TEST_URL` origin را تغییر می‌دهد. تست Node از WordPress شبیه‌سازی‌شده استفاده می‌کند و تست مرورگر مقاله‌های عمومی واقعی را می‌خواند اما هویت و POST دیدگاه را intercept می‌کند؛ هیچ دیدگاه واقعی روی سایت منتشر نمی‌کند. خروجی بصری در `artifacts/blog` ذخیره می‌شود.

آزمون ثبت واقعی دیدگاه با مشتری لاگین‌شده و تأیید نهایی مدیر نیاز به حساب آزمایشی مجاز دارد؛ سبزشدن تست‌های شبیه‌سازی‌شده به معنی اجرای نوشتن زنده نیست.

مراجع قرارداد: [Posts](https://developer.wordpress.org/rest-api/reference/posts/)، [Comments](https://developer.wordpress.org/rest-api/reference/comments/)، [cookie authentication](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/)، [sanitize-html](https://github.com/apostrophecms/apostrophe/tree/main/packages/sanitize-html).
