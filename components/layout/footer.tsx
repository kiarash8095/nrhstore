import Image from "next/image";
import Link from "next/link";
import { FaCode, FaInstagram } from "react-icons/fa";
import { LiaTelegram } from "react-icons/lia";
import { TfiHeadphoneAlt } from "react-icons/tfi";

import enamadLogo from "@/public/enamad_icon.png";
import footerLogo from "@/public/nrh-header-footer.png";
import { SticksToFooter } from "../modules/mainPage/SticksToFooter";

const quickAccessMenu = [
  { id: 1, title: "فروشگاه", href: "/products" },
  { id: 2, title: "پنل کاربری", href: "/dashboard" },
  { id: 3, title: "سوالات متداول", href: "/qa" },
  { id: 4, title: "تماس با ما", href: "/contact-us" },
];

const popularMenu = [
  { id: 1, title: "لپ تاپ", href: "/products/category/laptop" },
  { id: 2, title: "لوازم جانبی", href: "/products/category/accessory" },
  { id: 3, title: "شبکه", href: "/products/category/network" },
  { id: 4, title: "تجهیزات اداری", href: "/products/category/edari" },
];

export default function Footer() {
  return (
    <footer className="w-full bg-[#f7f8fa] px-2 py-4 text-white sm:px-4 sm:py-6">
        <SticksToFooter/>
      <div className="mx-auto w-[96%] max-w-[1400px] overflow-hidden rounded-2xl bg-[#111214] shadow-[0_16px_45px_rgba(15,23,42,0.12)] sm:rounded-3xl">
        <div className="px-4 py-5 sm:px-8 sm:py-7 lg:px-12">
          <div className="flex w-[80%] max-md:w-[95%] m-auto flex-col gap-3 rounded-2xl bg-orange-500 px-4 py-4
           text-center sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-right">
            <p className="text-sm font-medium leading-7 sm:text-base">
              ما از ساعت ۸:۳۰ تا ۱۳ و ۱۶ تا ۲۰ پاسخگوی شما هستیم.
            </p>
            <a
              href="tel:08131775"
              className="inline-flex items-center justify-center gap-2 text-sm font-bold transition hover:-translate-y-0.5 hover:text-orange-100 sm:text-base"
            >
              <TfiHeadphoneAlt className="text-lg" />
              <span>۰۸۱-۳۱۷۷۵</span>
            </a>
          </div>

          <div className="grid gap-9 py-9 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_0.8fr] lg:gap-8">
            <div className="flex flex-col items-center gap-5 text-center sm:items-start sm:text-right">
              <Image
                loading="lazy"
                src={footerLogo}
                className="h-auto w-[145px] sm:w-[165px]"
                alt="لوگوی نوین رایانه همدان"
                width={165}
                height={100}
              />
              <p className="max-w-sm text-sm font-light leading-7 text-gray-400">
                همدان، خیابان بوعلی، کوچه شریف، ساختمان نوین
              </p>
              <div className="flex items-center gap-3 rounded-xl bg-white/10 p-2">
                <a
                  href="https://t.me/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="تلگرام"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 transition hover:bg-sky-500 hover:text-white"
                >
                  <LiaTelegram size={24} />
                </a>
                <a
                  href="https://instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="اینستاگرام"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 transition hover:bg-pink-500 hover:text-white"
                >
                  <FaInstagram size={21} />
                </a>
              </div>
            </div>

            <div className="text-center sm:text-right">
              <h2 className="mb-4 text-base font-bold text-white">
                دسترسی سریع
              </h2>
              <ul className="space-y-3 text-sm text-gray-400">
                {quickAccessMenu.map((item) => (
                  <li key={item.id}>
                    <Link
                      className="transition hover:text-orange-400"
                      href={item.href}
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-center sm:text-right">
              <h2 className="mb-4 text-base font-bold text-white">محبوب‌ها</h2>
              <ul className="space-y-3 text-sm text-gray-400">
                {popularMenu.map((item) => (
                  <li key={item.id}>
                    <Link
                      className="transition hover:text-orange-400"
                      href={item.href}
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-center gap-3 sm:items-start lg:items-center">
              <p className="text-sm font-bold text-white">نماد اعتماد</p>
              <div className="rounded-xl bg-white p-2">
                <Image
                  loading="lazy"
                  src={enamadLogo}
                  width={92}
                  height={92}
                  alt="نماد اعتماد الکترونیکی"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-white/10 pt-5 text-center text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:text-right">
            <p>تمامی حقوق برای شرکت نوین رایانه همدان محفوظ است.</p>
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <FaCode aria-hidden="true" />
              <span>پیاده‌سازی توسط کیارش افروغ</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
