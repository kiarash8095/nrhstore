import type { SiteBanner } from '../schemas/banner.schema';

type BannerPresentation = {
  title: string;
  description: string;
  href: string;
};

// Destinations belong to these bundled creatives, not their editable titles.
// New uploads lead to the catalog until a destination is explicitly configured.
const presentations: Record<string, BannerPresentation> = {
  '/Untitled-1-2.webp': { title: 'لپ‌تاپ برای کار، بازی و خلاقیت', description: 'لپ‌تاپ مناسب نیازتان را پیدا کنید.', href: '/products/category/laptop' },
  '/Untitled-11.webp': { title: 'یک قدم نزدیک‌تر به سیستم دلخواهتان', description: 'کیس‌ها و تجهیزات گیمینگ را ببینید.', href: '/products/category/pc-case' },
  '/slider1-5.webp': { title: 'چاپ باکیفیت، برای خانه و محل کار', description: 'پرینترهای فروشگاه را با هم مقایسه کنید.', href: '/products/category/printer' },
  '/slider4.webp': { title: 'برای یک ارتباط پایدار', description: 'تجهیزات شبکه متناسب با فضای کارتان.', href: '/products/category/network' },
  '/11-1.webp': { title: 'موس، کیبورد و هدست', description: 'همراه‌های کاربردی میز کار شما', href: '/products/category/accessory' },
  '/22-1.webp': { title: 'UPS و تجهیزات محافظ برق', description: 'انتخاب تجهیزات برای فضای کار', href: '/products' },
  '/33-1.webp': { title: 'لوازم جانبی روزمره', description: 'برای اتصال، شارژ و همراهی بیشتر', href: '/products/category/accessory' },
  '/Untitled-111.webp': { title: 'اتصال پایدار، ارتباط بدون محدودیت', description: 'تجهیزات شبکه را یک‌جا ببینید.', href: '/products/category/network' },
  '/Layer-2.webp': { title: 'قطعات و تجهیزات کامپیوتر', description: 'برای ساخت یا ارتقای سیستم شما', href: '/products/category/hardware' },
  '/Layer-2-1.webp': { title: 'لوازم جانبی لپ‌تاپ', description: 'جزئیات کوچک برای استفاده بهتر', href: '/products/category/laptop-accessories' },
  '/کیس-گیمینگ-همدان.webp': { title: 'فضای بیشتری برای قدرت و خلاقیت', description: 'کیس‌های فروشگاه را ببینید.', href: '/products/category/pc-case' },
  '/خرید_پرینتر_همدان.webp': { title: 'پرینتر مناسب کارتان را پیدا کنید', description: 'انتخابی برای خانه، دفتر و کسب‌وکار', href: '/products/category/printer' },
};

export function getBannerPresentation(banner: SiteBanner): BannerPresentation {
  const presentation = presentations[banner.src] || {
    title: banner.title,
    description: 'محصولات فروشگاه را ببینید و انتخاب کنید.',
    href: '/products',
  };
  const genericTitle = /^(?:بنر(?:\s+(?:اول|دوم|سوم|اتصال پایدار|[0-9۰-۹]+))?|عکس (?:تجهیزات(?:\s+[0-9۰-۹]+)?|کیس گیمینگ))$/.test(banner.title.trim());
  return { ...presentation, title: genericTitle ? presentation.title : banner.title };
}
