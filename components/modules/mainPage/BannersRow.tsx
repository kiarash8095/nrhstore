import Image from "next/image";

import banner1 from "@/public/11-1.webp";
import banner2 from "@/public/22-1.webp";
import banner3 from "@/public/33-1.webp";

const banners = [
  { id: 1, title: "بنر اول", img: banner1 },
  { id: 2, title: "بنر دوم", img: banner2 },
  { id: 3, title: "بنر سوم", img: banner3 },
];

export function BannersRow() {
  return (
    <section
      className="mx-auto my-8 w-[96%] max-w-7xl"
      aria-label="بنرهای ویژه"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
        {banners.map((banner) => (
          <div
            key={banner.id}
            className="group relative aspect-[16/7] overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-gray-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <Image
              src={banner.img}
              alt={banner.title}
              fill
              sizes="(max-width: 767px) 96vw, (max-width: 1280px) 31vw, 420px"
              className="object-cover transition duration-500 group-hover:scale-105"
              priority={banner.id === 1}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
          </div>
        ))}
      </div>
    </section>
  );
}
