# سئو، URLها و هدایت مسیرهای قدیمی

Next.js در این معماری مالک URL عمومی، HTML و metadata است. محصول و دسته از ووکامرس می‌آیند، اما لینک کاربر باید به صفحه Next برسد. تنظیم سئو به معنی تکمیل پرداخت یا انتقال دامنه سایت زنده نیست.

**URL عمومی را از URL بک‌اند جدا نگه دار**

[configs/site.ts](D:/Projects2/nrh_store_nextjs/configs/site.ts) مبدأ فرانت را از `NEXT_PUBLIC_SITE_URL` می‌گیرد؛ مقدار باید origin بدون مسیر، query یا credential باشد. `WP_API_URL` ریشه REST بک‌اند است و نقش دیگری دارد. `absoluteUrl` لینک کامل فرانت را می‌سازد.

[lib/urls.ts](D:/Projects2/nrh_store_nextjs/lib/urls.ts) برای محصول و دسته URL تولید می‌کند. `decodeSlug` یک مرحله decode و normalize یونیکد NFC انجام می‌دهد؛ سپس سازنده مسیر یک بار encode می‌کند. این کار برای slug فارسی که ممکن است از قبل encode شده باشد اهمیت دارد. چسباندن مستقیم `permalink` وردپرس یا encode چندباره، URL فرانت را خراب می‌کند.

`pagePath` برای صفحه اول query اضافه نمی‌کند و برای بقیه `?page=N` می‌سازد. `parsePage` فقط عدد مثبت با قالب مجاز می‌پذیرد؛ محدودبودن تعداد واقعی صفحه را خود صفحه با پاسخ backend بررسی می‌کند.

**metadata و canonical**

root layout عنوان پیش‌فرض و template نام فروشگاه، description، `metadataBase`، Open Graph، Twitter و robots اولیه را دارد. صفحه محصول از داده واقعی title، شرح خلاصه‌شده، تصویر و canonical می‌سازد؛ صفحه دسته و کاتالوگ canonical هر صفحه pagination را نگه می‌دارند.

| صفحه | محل اصلی |
| --- | --- |
| محصول | [products/seo/metadata.ts](D:/Projects2/nrh_store_nextjs/features/products/seo/metadata.ts) |
| دسته | [categories/seo/metadata.ts](D:/Projects2/nrh_store_nextjs/features/categories/seo/metadata.ts) |
| کاتالوگ | [products/page.tsx](D:/Projects2/nrh_store_nextjs/app/(store)/products/page.tsx) |
| حساب و خرید شخصی | layout حساب و metadata صفحات سبد/تسویه |

canonical URL ترجیحی محتوا را معرفی می‌کند؛ کاربر را منتقل نمی‌کند. redirect واقعاً مسیر را عوض می‌کند. title و canonical را در HTML نهایی بررسی کن؛ صرف مشاهده عنوان روی صفحه کافی نیست. metadata در Server Component صادر می‌شود و دریافتش در نسخه نصب‌شده می‌تواند stream شود؛ [راهنمای محلی metadata](D:/Projects2/nrh_store_nextjs/node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md) مرجع نسخه است.

**داده ساختاریافته**

[structured-data.ts](D:/Projects2/nrh_store_nextjs/features/products/seo/structured-data.ts) محصول، تصویر، SKU و در صورت وجود برند را می‌سازد. Offer فقط برای قیمت مثبت و امن، minor unit معتبر و ارز پشتیبانی‌شده ساخته می‌شود. در این پیاده‌سازی `IRT` به ریال تبدیل و `priceCurrency` برابر `IRR` قرار می‌گیرد؛ `IRR` نیز پشتیبانی می‌شود. ارزهای دیگر به‌صورت خودکار Offer صحیح نمی‌گیرند.

فرمول: `amount / 10 ** currency_minor_unit` و برای تومان، ضرب در ۱۰. امتیاز ساختگی اضافه نمی‌شود؛ aggregateRating فقط با تعداد دیدگاه مثبت و rating معتبر ساخته می‌شود. موجودی schema از backend می‌آید؛ schema تضمین قیمت نهایی checkout نیست.

`BreadcrumbList` محصول و دسته، رابطه مسیرها را توضیح می‌دهد. Organization در خانه معرفی می‌شود. [JsonLd](D:/Projects2/nrh_store_nextjs/components/common/JsonLd.tsx) داده را JSON می‌کند و `<` را escape می‌کند تا متن داده، مرز تگ script را نشکند. helper متن metadata، HTML را به متن ساده نزدیک می‌کند؛ sanitizer عمومی برای نمایش دلخواه HTML نیست.

**robots و sitemap**

[robots.ts](D:/Projects2/nrh_store_nextjs/app/robots.ts) تا وقتی `SITE_INDEXING_ENABLED` دقیقاً `true` نباشد، crawl کل سایت را منع می‌کند. metadata ریشه هم index را غیرفعال می‌کند. پس از فعال‌سازی، مسیرهای dashboard، account، مدیریت بنر و API از crawl کنار گذاشته می‌شوند. سبد و checkout metadata خصوصی/noindex خودشان را دارند؛ دسته خالی هم noindex می‌گیرد.

robots ابزار احراز هویت نیست؛ فایل خصوصی را محافظت نمی‌کند و به‌تنهایی تضمین حذف URL از نتایج نیست. staging در صورت نیاز به محرمانگی باید دسترسی واقعی محدود داشته باشد.

[sitemap.ts](D:/Projects2/nrh_store_nextjs/app/sitemap.ts) محصولات را با صفحه‌بندی کامل و دسته‌های دارای محصول را می‌گیرد و همراه خانه، فروشگاه، دسته‌ها و تماس فهرست می‌کند؛ مسیرهای تکراری حذف می‌شوند و `revalidate` برابر ۳۰۰ است. تاریخ ساختگی `lastModified` برای همه موارد اضافه نشده است. Route sitemap با خاموش‌بودن indexing لزوماً حذف نمی‌شود؛ robots فقط آن را اعلام نمی‌کند.

**مسیرهای قدیمی و قسمت‌های باقی‌مانده**

`next.config.ts` مسیرهای `/product/<slug>`، `/product-category/<slug>` و `/فروشگاه` را به مقصد داخلی می‌فرستد. مسیر دسته چندسطحی، Route جدا دارد و آخرین slug را resolve می‌کند. این‌ها انتقال کاربر به وردپرس نیستند. نشانی نامعتبر ۴۰۴ می‌شود؛ همه URLهای گمشده را به خانه هدایت نکرده‌ایم.

بلاگ، برندها و همه URLهای قدیمی هنوز نگاشت کامل ندارند. H1 فعلی خانه کامنت شده و اطلاعات تماس ثابت نیازمند تأیید کسب‌وکار است. sitemap و schema جای محتوای مفید، سیاست ارسال/مرجوعی یا بررسی Search Console را نمی‌گیرند.

**تمرین:** برای یک محصول فارسی، URL ورودی، canonical، لینک کارت و URL داخل JSON-LD را مقایسه کن؛ همگی باید به فرانت برسند. صفحه دوم کاتالوگ، دسته خالی و slug ناموجود را جدا بررسی کن. `test:headless` URL، وبهوک و تولید schema را با داده کنترل‌شده بررسی می‌کند؛ crawl و آزمون موتور جست‌وجو کار جداست.
