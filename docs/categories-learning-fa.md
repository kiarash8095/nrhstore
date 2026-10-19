# دسته‌بندی‌ها، درخت دسته و مگامنو

فیچر `categories` سه مصرف اصلی دارد: فهرست دسته‌ها در `/categories`، صفحه محصولات هر دسته در `/products/category/<slug>` و منوی هدر. هر سه از داده ووکامرس استفاده می‌کنند، اما یک صفحه و یک نوع کش نیستند.

**ساختار داده**

`id` شناسه دسته، `slug` قطعه URL، `parent` شناسه والد و `count` تعداد محصول است. `parent=0` دسته ریشه را مشخص می‌کند. شناسه‌ها متعلق به دیتابیس همین فروشگاه‌اند؛ مثلاً ۵۵ را در پروژه دیگر معادل لپ‌تاپ فرض نکن.

[getAllCategories](D:/Projects2/nrh_store_nextjs/features/categories/api/categories.api.ts) ابتدا `/products/categories?per_page=100&hide_empty=false` را می‌خواند، سپس بر اساس `X-WP-TotalPages` بقیه صفحه‌ها را می‌گیرد. `getCategoryBySlug` و `getSpecificCategory` روی همین فهرست جست‌وجو و یک object یا `null` برمی‌گردانند.

**فهرست دسته‌ها**

[CategoriesGrid](D:/Projects2/nrh_store_nextjs/features/categories/components/CategoriesGrid.tsx) دسته پیش‌فرض «دسته‌بندی‌نشده» را کنار می‌گذارد، ریشه‌ها و فرزندان مستقیمشان را بر اساس تعداد محصول مرتب می‌کند و موارد باقی‌مانده را هم نشان می‌دهد. این مرتب‌سازی، پیمایش بازگشتی کامل با هر عمقی نیست. تصویر/آیکن هر کارت و لینک محلی آن در `CategoryCard` ساخته می‌شود.

`CategoriesPage` عنوان صفحه را زود نمایش می‌دهد و شبکه را داخل `Suspense` قرار می‌دهد. در خانه، کامپوننت دیگری به نام `Categories` تعداد مشخصی دسته منتخب را به‌صورت carousel می‌گیرد؛ این دو را با هم اشتباه نگیر.

**صفحه یک دسته**

```text
slug و page
  → پیدا کردن دسته
  → دریافت موازی محصولات صفحه و فهرست دسته‌ها
  → ساخت breadcrumb والدها و لینک فرزندان
  → کارت محصولات و Pagination
```

[CategoryPage](D:/Projects2/nrh_store_nextjs/features/categories/components/CategoryPage.tsx) برای breadcrumb از والدها بالا می‌رود؛ `Set` جلوی حلقه در داده ناسالم را می‌گیرد. محصول‌ها با `category.id` فیلتر می‌شوند. slug نامعتبر، page نامعتبر و صفحه بیرون محدوده به `notFound()` می‌روند. دسته معتبر ولی خالی، پیام خالی دارد.

مسیر قدیمی `/product-category/a/b` آخرین قطعه را برای پیدا کردن دسته استفاده و به مسیر جدید داخل Next هدایت دائمی می‌کند. همه لینک‌ها باید مقصد فرانت داشته باشند؛ `permalink` وردپرس را مستقیم مصرف نکن.

**مگامنو و پیش‌دریافت**

[StoreHeader](D:/Projects2/nrh_store_nextjs/components/layout/StoreHeader.tsx) دسته‌های اصلی هدر را از فهرست سروری با slugهای منتخب برمی‌دارد. [CategoryMenu](D:/Projects2/nrh_store_nextjs/features/categories/components/CategoryMenu.tsx) تعامل مرورگر را مدیریت می‌کند:

1. دسته فعال از hover یا اولین دسته تعیین می‌شود.
2. Query با کلید `['sub-category', id]` زیردسته‌ها را از `categories.client.ts` می‌خواند.
3. روی hover، `prefetchQuery` همان کلید را گرم می‌کند؛ `staleTime` ده دقیقه است.
4. پاسخ از BFF کاتالوگ عبور می‌کند؛ در انتظار، skeleton دیده می‌شود.

ستون سوم منو فعلاً رزرو و خالی است. پشتیبانی کامل keyboard navigation و نمایش اختصاصی خطای شبکه در این منوی سفارشی را پیاده‌سازی‌شده فرض نکن.

**نکته‌های انتقال به پروژه بعدی**

فایل‌های constants، شناسه‌های خانه و ترتیب آیکن‌های منو همه یک مرجع پیکربندی واحد نیستند و بعضی شناسه‌ها متفاوت‌اند؛ هر محل مصرف را بررسی کن. helperهای قدیمی‌تر، query keyهایی مثل `sub-categories` دارند که با `sub-category` منو کش مشترک نمی‌سازد. مسیر client زیردسته‌ها نیز یک صفحه حداکثر صدتایی می‌گیرد و صفحه‌بندی کامل `getAllCategories` را ندارد.

در برخی helperهای سروری، شرط `NEXT_PUBLIC_BASE_URL === 'production'` برای ۶۰/۳۶۰۰ ثانیه دیده می‌شود؛ این شرط معادل `NODE_ENV` نیست. برای یادگیری رفتار واقعی، مقدار محیط و مصرف‌کننده تابع را ببین؛ کامنت را تضمین زمان کش فرض نکن.

**تمرین:** یک دسته سه‌سطحی را روی کاغذ رسم کن و breadcrumb آن را با حلقه `CategoryPage` بساز. سپس منو را چند بار بین دو دسته جابه‌جا کن و در Network اثر prefetch و کش را ببین. تست‌های پایه در `npm run test:headless` هستند؛ خواندن فهرست، lookup و صفحه‌بندی را پوشش می‌دهند.
