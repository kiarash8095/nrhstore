import type { BannerDocument } from "../schemas/banner.schema";

export const defaultBannerDocument: BannerDocument = {
  revision: "initial",
  banners: [
    { id: "slider-1", group: "slider", title: "بنر ۱", src: "/Untitled-1-2.webp", width: 1774, height: 444 },
    { id: "slider-2", group: "slider", title: "بنر ۲", src: "/Untitled-11.webp", width: 1774, height: 443 },
    { id: "slider-3", group: "slider", title: "بنر ۳", src: "/slider1-5.webp", width: 2000, height: 400 },
    { id: "slider-4", group: "slider", title: "بنر ۴", src: "/slider4.webp", width: 2000, height: 400 },
    { id: "featured-1", group: "featured", title: "بنر اول", src: "/11-1.webp", width: 461, height: 214 },
    { id: "featured-2", group: "featured", title: "بنر دوم", src: "/22-1.webp", width: 455, height: 214 },
    { id: "featured-3", group: "featured", title: "بنر سوم", src: "/33-1.webp", width: 461, height: 217 },
    { id: "connection-1", group: "connection", title: "بنر اتصال پایدار", src: "/Untitled-111.webp", width: 1983, height: 191 },
    { id: "hardware-1", group: "hardware", title: "عکس تجهیزات", src: "/Layer-2.webp", width: 1919, height: 609 },
    { id: "hardware-2", group: "hardware", title: "عکس تجهیزات ۲", src: "/Layer-2-1.webp", width: 1919, height: 609 },
    { id: "gaming-1", group: "gaming", title: "عکس کیس گیمینگ", src: "/کیس-گیمینگ-همدان.webp", width: 1983, height: 185 },
    { id: "printer-1", group: "printer", title: "خرید پرینتر همدان", src: "/خرید_پرینتر_همدان.webp", width: 1983, height: 202 },
  ],
};
