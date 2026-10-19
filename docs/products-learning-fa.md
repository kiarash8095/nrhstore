# محصولات: کاتالوگ، جزئیات و انتخاب تنوع

فیچر `products` محصول را از WooCommerce Store API می‌خواند و کارت، فهرست، جزئیات و بخش خرید را می‌سازد. صفحه و metadata سروری‌اند؛ انتخاب تصویر و تنوع و افزودن به سبد در مرورگر انجام می‌شوند.

**مسیرهای اصلی**

| URL | مسیر اجرای کد |
| --- | --- |
| `/products?page=2` | Route → `CatalogPage` → `getProductCollection` → کارت‌ها و Pagination |
| `/products/<slug>` | Route → `ProductPage` → `getProductDetails` → مشخصات، تصاویر و خرید |
| صفحه دسته | فیچر categories → `getProductCollection(page, categoryId)` |

[products.api.ts](D:/Projects2/nrh_store_nextjs/features/products/api/products.api.ts) نقطه شروع دریافت داده است. فهرست پیش‌فرض ۲۰ محصول دارد؛ تعداد کل و صفحه‌ها از هدرهای ووکامرس خوانده می‌شوند. `parsePage` ورودی‌هایی مثل صفر، عدد منفی یا مقدار چندگانه را رد می‌کند و صفحه بالاتر از تعداد واقعی به `notFound()` می‌رود. صفحه‌بندی روی سرور انجام می‌شود؛ همه محصولات را برای نمایش یک صفحه به مرورگر نمی‌فرستیم.

`getProductDetails` با `React.cache` بین مصرف‌کننده‌های یک رندر، مثل صفحه و metadata، اشتراک دارد. ورودی slug بررسی و encode می‌شود. ۴۰۴ به `null` تبدیل می‌شود؛ قطعی بک‌اند خطا باقی می‌ماند. کد فعلی slug را در `/products/<slug>` به Store API می‌دهد؛ در فروشگاه بعدی پذیرش این قرارداد را آزمایش کن. اگر محصول برگشتی slug متفاوتی داشته باشد، صفحه به URL صحیح داخل Next هدایت دائمی می‌شود.

**خروجی هر بخش از کجا می‌آید؟**

| بخش | داده و رفتار |
| --- | --- |
| `ProductCard` | تصویر، نام، قیمت، موجودی، امتیاز معتبر و لینک محلی محصول |
| `ProductImages` | تصویر فعال و thumbnailها؛ state محلی فقط برای انتخاب تصویر |
| `ProductGalleryDialog` | گالری بزرگ با زوم، جابه‌جایی و کنترل صفحه‌کلید |
| `ProductStages` | معرفی، ویژگی‌ها و خلاصه امتیاز محصول |
| `RelatedProducts` | درخواست محصولات مرتبط؛ در شکست، بخش پنهان می‌شود |
| `ProductPurchase` | انتخاب variation و ساخت ورودی افزودن به سبد |

[ProductCard](D:/Projects2/nrh_store_nextjs/features/products/components/ProductCard.tsx) entityهای متن وردپرس را به متن خوانا تبدیل می‌کند؛ نام محصول را HTML خام نمی‌کند. تصویر خالی و محصول بدون دیدگاه، حالت مشخص دارند. تمام کارت یک Link است و CTA آن «مشاهده محصول» است. عملیات واقعی افزودن در صفحه محصول انجام می‌شود.

**انتخاب محصول متغیر چگونه کار می‌کند؟**

1. صفحه سروری برای محصول `variable` تنوع‌ها را دریافت می‌کند.
2. `ProductPurchase` ویژگی‌های دارای `has_variations` و انتخاب‌های پیش‌فرض را می‌خواند.
3. بعد از کامل‌شدن انتخاب‌ها، ترکیب ویژگی‌ها با variation واقعی تطبیق داده می‌شود.
4. قیمت و خریدپذیری از همان تنوع انتخاب‌شده نمایش داده می‌شود.
5. `AddToCartButton` شناسه همان تنوع، تعداد اولیه و آرایه `variation` را به هوک سبد می‌دهد.

برای ویژگی سراسری، نامی مانند `pa_color` و مقدار واقعی slug اهمیت دارد. صرفاً متن فارسی گزینه را به‌عنوان شناسه تنوع نفرست. تا انتخاب معتبر و خریدپذیر نباشد، دکمه غیرفعال است؛ ووکامرس دوباره ورودی را کنترل می‌کند. جزئیات ادامه مسیر در [سبد خرید](D:/Projects2/nrh_store_nextjs/docs/cart-learning-fa.md) است.

**مرز قابلیت فعلی**

- `RatingSection` میانگین و تعداد دیدگاه واقعی را نشان می‌دهد؛ ارسال یا فهرست متن reviewها ساخته نشده است.
- بعضی متن‌های فروشگاه، مثل زمان ارسال «۳ روز کاری» و ضمانت، ثابت‌اند. آن‌ها را نتیجه محاسبه ارسال ووکامرس فرض نکن.
- برخی کارت‌ها و جست‌وجو قیمت را با `sp` و برچسب ثابت تومان نمایش می‌دهند. نمایش سبد و schema منطق واحد پول جدا دارند؛ برای فروشگاه با ارز دیگر، همه نمایش‌ها باید تطبیق داده شوند.
- جزئیات، وجود تصویر اول را در بعضی بخش‌ها فرض می‌کند؛ fallback کارت به معنی پوشش تمام حالت‌های گالری نیست.
- دریافت variation در این نسخه سقف `per_page=100` دارد و برای بیش از آن صفحه‌بندی نشده است. فیلتر پیشرفته و مرتب‌سازی قابل انتخاب کاربر هم فعلاً وجود ندارند.

**فایل‌ها را به این ترتیب بخوان**

[CatalogPage.tsx](D:/Projects2/nrh_store_nextjs/features/products/components/CatalogPage.tsx) → [products.api.ts](D:/Projects2/nrh_store_nextjs/features/products/api/products.api.ts) → [ProductPage.tsx](D:/Projects2/nrh_store_nextjs/features/products/components/ProductPage.tsx) → [ProductPurchase.tsx](D:/Projects2/nrh_store_nextjs/features/products/components/ProductPurchase.tsx). گالری در [راهنمای تعامل‌ها](D:/Projects2/nrh_store_nextjs/docs/ui-interactions-fa.md) و metadata در [راهنمای سئو](D:/Projects2/nrh_store_nextjs/docs/seo-routing-fa.md) توضیح داده شده‌اند.

**تمرین:** برای یک محصول متغیر، تغییر قیمت پس از انتخاب رنگ و payload افزودن را در Network دنبال کن. بعد در تست‌ها تفاوت محصول ناموجود و پاسخ ۵۰۳ را بخوان. بررسی‌ها: `npm run test:headless` و برای اتصال به خرید، تست‌های سبد.
