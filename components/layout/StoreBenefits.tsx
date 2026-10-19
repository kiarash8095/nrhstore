import FireIcon from "@/public/HugeiconsFireSecurity-1.webp";
import HotPriceIcon from "@/public/HugeiconsHotPrice-1.webp";
import TruckIcon from "@/public/HugeiconsTruckDelivery-1.webp";
import QuestionIcon from "@/public/HugeiconsUserQuestion01-1.webp";
import Image from "next/image";

export const icons = [
  { name: "امنیت کامل", desc: "دارای درگاه ایمن و مطمئن", img: FireIcon },
  {
    name: "بهترین قیمت",
    desc: "مطمئن باش کف قیمت بازارو داریم",
    img: HotPriceIcon,
  },
  { name: "پشتیبانی خوب", desc: "تلفنی پاسخگوییم", img: QuestionIcon },
  { name: "ارسال سریع", desc: "ارسال فوری شهر همدان", img: TruckIcon },
];

export function SticksToFooter() {
  return (
    <section
      className="mx-auto my-6 w-[94%] max-w-6xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm sm:my-8 sm:w-[92%] sm:rounded-3xl"
      aria-label="مزیت‌های خرید از نوین رایانه"
    >
      <div className="grid grid-cols-2 divide-x divide-y divide-dashed divide-gray-200 sm:grid-cols-4 sm:divide-y-0">
        {icons.map((item) => (
          <div
            key={item.name}
            className="flex min-w-0 flex-col items-center justify-center gap-2 px-2 py-4 text-center sm:flex-row sm:gap-3 sm:px-4 sm:py-5 sm:text-right"
          >
            <Image
              className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12"
              src={item.img}
              alt={item.name}
              width={48}
              height={48}
            />
            <div className="min-w-0">
              <p className="text-xs font-bold leading-5 text-gray-800 sm:text-sm">
                {item.name}
              </p>
              <span className="mt-0.5 block text-[10px] leading-5 text-gray-500 sm:text-xs">
                {item.desc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
