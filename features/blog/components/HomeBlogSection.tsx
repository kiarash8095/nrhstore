import Link from "next/link";
import { ArrowLeft, BookOpenText } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getBlogCollection } from "../api/blog.service";
import { BlogCard } from "./BlogCard";

export async function HomeBlogSection() {
  let posts;
  try {
    posts = (await getBlogCollection({ perPage: 6 })).items;
  } catch {
    return (
      <section
        aria-label="مجله نوین رایانه"
        className="my-14 w-full rounded-3xl border border-orange-100 bg-orange-50/50 p-6"
      >
        <h2 className="text-lg font-bold text-gray-900">مجله نوین رایانه</h2>
        <p className="mt-2 text-sm leading-7 text-gray-500">
          دریافت تازه‌های مجله موقتاً ممکن نیست.
        </p>
        <Link
          href="/blog"
          className="mt-3 inline-block text-sm font-bold text-orange-600"
        >
          رفتن به مجله و تلاش دوباره ←
        </Link>
      </section>
    );
  }
  return (
    <section
      className="my-12 w-full sm:my-16"
      aria-labelledby="home-blog-title"
      data-home-blog
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-500 sm:size-14">
            <BookOpenText aria-hidden="true" className="size-6" />
          </span>
          <div>
            <p className="mb-1 text-[10px] font-medium text-orange-600 sm:text-xs">
              بخوانید، کشف کنید، آگاهانه انتخاب کنید
            </p>
            <h2
              id="home-blog-title"
              className="text-lg font-black text-gray-900 sm:text-2xl"
            >
              تازه‌های مجله نوین رایانه
            </h2>
          </div>
        </div>
        <Link
          href="/blog"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] font-bold text-gray-600 transition hover:border-orange-300 hover:text-orange-600 sm:px-4 sm:text-xs"
        >
          همه مقاله‌ها
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
      </div>
      {posts.length ? (
        <Carousel
          opts={{ align: "start", direction: "rtl", loop: false }}
          aria-label="تازه‌ترین مقاله‌های مجله"
          className="w-full"
        >
          <CarouselContent className="-ms-5 items-stretch py-2">
            {posts.map((post) => (
              <CarouselItem
                key={post.id}
                className="flex basis-[88%] ps-5 min-[480px]:basis-[70%] sm:basis-1/2 lg:basis-1/3"
              >
                <BlogCard post={post} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious
            aria-label="مقاله‌های قبلی"
            className="-start-3 z-10 hidden size-10 border-gray-200 bg-white shadow-md hover:bg-orange-50 sm:flex"
          />
          <CarouselNext
            aria-label="مقاله‌های بعدی"
            className="-end-3 z-10 hidden size-10 border-gray-200 bg-white shadow-md hover:bg-orange-50 sm:flex"
          />
          <p className="mt-3 text-center text-[11px] text-gray-400 sm:hidden">
            برای دیدن مقاله‌های بیشتر، کارت‌ها را بکشید
          </p>
        </Carousel>
      ) : (
        <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
          به‌زودی اولین مقاله‌های مجله اینجا منتشر می‌شوند.
        </p>
      )}
    </section>
  );
}
