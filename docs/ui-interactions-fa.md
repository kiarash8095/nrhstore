# سیستم ظاهری، اجزای مشترک و تعامل‌ها

این پروژه از Tailwind CSS 4، اجزای محلی shadcn با primitiveهای Base UI، Motion و Embla استفاده می‌کند. برای تغییر ظاهر، ابتدا لایه مالک را پیدا کن: توکن سراسری، کامپوننت عمومی یا UI یک فیچر.

**رنگ، فونت و RTL**

[globals.css](D:/Projects2/nrh_store_nextjs/styles/globals.css) متغیرهایی مانند primary، border، muted و radius را به theme متصل می‌کند. کلاس‌های نارنجی مستقیم هم در فیچرها وجود دارند؛ بنابراین تغییر یک توکن لزوماً تمام رنگ‌های برند را عوض نمی‌کند. متغیرهای dark تعریف شده‌اند، اما از وجودشان نباید سوییچ کامل حالت تاریک نتیجه گرفت.

[fonts.ts](D:/Projects2/nrh_store_nextjs/lib/fonts.ts) فونت یکان‌بخ محلی را با `next/font/local` و متغیر `--font-yekan` معرفی می‌کند. root layout دارای `lang="fa"` و `dir="rtl"` است. برای متن آمیخته، شماره یا قیمت از `dir="ltr"`/`auto` در محل مناسب استفاده می‌شود. `start/end` و `ps/pe` بر خلاف left/right به جهت نوشته وابسته‌اند؛ تغییر آن‌ها را با RTL بررسی کن.

**اجزای عمومی و حالت‌های رابط**

`components/ui` شکل و قرارداد عمومی Button، Card، Input، Dialog و Rating را دارد. layout و فیچرها این اجزا را ترکیب می‌کنند. `cn` به ترکیب classها کمک می‌کند و نباید منطق خرید یا نشست داخل Button عمومی قرار بگیرد.

`Skeleton` جای محتوا را رزرو می‌کند و فعلاً به‌صورت عمومی استاتیک است. [SkeletonStatus](D:/Projects2/nrh_store_nextjs/components/common/SkeletonStatus.tsx) وضعیت بارگذاری را با `aria-busy` و `role="status"` به صفحه‌خوان اعلام می‌کند. این حالت با محتوای خالی یا خطای شبکه فرق دارد. ارتفاع نزدیک به خروجی واقعی، جابه‌جایی صفحه را کم می‌کند.

**دیالوگ و سایدبار**

[dialog.tsx](D:/Projects2/nrh_store_nextjs/components/ui/dialog.tsx) روی `@base-ui/react/dialog` ساخته شده است. Portal لایه را از محدودیت container خارج می‌کند و primitive مسئول بخش مهمی از رفتار focus/بستن است. title، description، نام دکمه آیکنی و وضعیت disabled هنوز باید درست مصرف شوند. گالری و ورود از همین زیرساخت استفاده می‌کنند؛ سایدبار سبد هم primitive دیالوگ و UI اختصاصی خود را دارد.

دیالوگ جست‌وجوی موبایل سفارشی است؛ صرف `aria-modal` تمام رفتار یک modal دسترس‌پذیر را ایجاد نمی‌کند. ارزیابی keyboard، focus و برگشت focus باید روی مصرف‌کننده واقعی انجام شود.

**carousel چگونه به React وصل است؟**

[carousel.tsx](D:/Projects2/nrh_store_nextjs/components/ui/carousel.tsx) یک API بیرون از React به نام Embla دارد. کامپوننت اصلی context می‌دهد؛ Content قاب و ردیف، Item اسلاید و دکمه‌های Previous/Next عملیات حرکت را دارند.

`useSyncExternalStore` وضعیت `canScrollPrev/Next` را از API می‌خواند. تابع subscribe به `select` و `reInit` وصل و در cleanup هر دو را جدا می‌کند. snapshot اولیه سرور `false` است تا پیش از آماده‌شدن API وضعیت مشخصی داشته باشیم. boolean بودن snapshot هم از تولید object جدید در هر خواندن جلوگیری می‌کند.

این جایگزین، خطای قبلی setState هم‌زمان داخل effect را در این کامپوننت برطرف کرد؛ به معنی ممنوع‌بودن تمام effectها نیست. مصرف‌کننده مثل BannerSlider می‌تواند API را با `setApi` بگیرد و autoplay/شمارنده را جدا مدیریت کند. جهت Embla و آیکن‌ها و کلیدهای جهت را در چیدمان واقعی RTL آزمایش کن.

**گالری و زوم**

[use-image-zoom.ts](D:/Projects2/nrh_store_nextjs/features/products/hooks/use-image-zoom.ts) scale و offset را نگه می‌دارد. در مصرف فعلی حداقل ۱، حداکثر ۴ و گام دکمه ۰٫۵ است. دکمه، wheel، دوبارکلیک، pinch و drag به همین مدل وصل‌اند. اندازه طبیعی تصویر و قاب، حد مجاز pan را تعیین می‌کند تا تصویر از دسترس خارج نشود.

refها آخرین وضعیت حرکت را برای eventها نگه می‌دارند؛ state باعث رندر تصویر می‌شود. callback ref، ساخته‌شدن قاب داخل Portal را اعلام می‌کند تا listener بومی wheel در زمان درست با `passive:false` ثبت و بعد پاک شود. با تعویض تصویر یا بستن گالری، zoom reset می‌شود. کلیدهای مثبت/منفی، صفر و جهت‌ها نیز کنترل دارند.

**انیمیشن و طول عمر فرم**

[PageTransition](D:/Projects2/nrh_store_nextjs/components/common/PageTransition.tsx) برای مسیرهای معمول از AnimatePresence و key مسیر استفاده می‌کند. برای `/cart` و `/checkout` مسیر مستقیم دارد؛ mount دوباره در فاز خروج قبلاً state فرم را پاک می‌کرد. هر تغییر key ممکن است state زیر آن را از نو بسازد.

`useDragScroll` برای کشیدن ردیف و جلوگیری از کلیک ناخواسته بعد از drag است؛ `useSwipe` حرکت افقی را به callback تبدیل می‌کند. وجود helper به معنی مصرف آن در همه carouselها نیست. listener، observer و timer باید در cleanup متناسب پاک شوند؛ پاسخ دیررس داده هم به guard خودش نیاز دارد.

**تمرین:** با Tab و Escape ورود، گالری و سایدبار را باز و بسته کن. در عرض ۳۹۰ پیکسل overflow افقی را بررسی کن. حالت reduced motion را در مرورگر فعال کن؛ بعضی کارت‌ها رعایتش می‌کنند، اما ممیزی کامل همه انیمیشن‌ها انجام نشده است. اندازه‌گیری افت فریم را با Performance انجام بده؛ افزودن اسکرول نرم به‌تنهایی هزینه layout یا JavaScript را کم نمی‌کند.
