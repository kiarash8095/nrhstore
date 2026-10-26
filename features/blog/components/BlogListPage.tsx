import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Search,
  SearchX,
} from "lucide-react";
import { getBlogCategories, getBlogCollection } from "../api/blog.service";
import { BlogApiError } from "../server/transport";
import { blogListPath } from "../utils/blog";
import { parsePage } from "@/lib/urls";
import { e2p } from "@/utils/numbers";
import { BlogCard } from "./BlogCard";

export interface BlogListProps {
  searchParams: Promise<{
    page?: string | string[];
    category?: string | string[];
    q?: string | string[];
  }>;
}
export default async function BlogListPage({ searchParams }: BlogListProps) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const category =
    params.category === undefined
      ? undefined
      : typeof params.category === "string" &&
          /^[1-9]\d{0,8}$/.test(params.category)
        ? Number(params.category)
        : null;
  const search =
    params.q === undefined
      ? ""
      : typeof params.q === "string"
        ? params.q.trim()
        : null;
  if (
    !page ||
    category === null ||
    search === null ||
    search.length > 100 ||
    /[\u0000-\u001f]/.test(search)
  )
    notFound();
  const categories = await getBlogCategories();
  const activeCategory = categories.find((item) => item.id === category);
  if (category && !activeCategory) notFound();
  let collection;
  try {
    collection = await getBlogCollection({ page, category, search });
  } catch (error) {
    if (
      error instanceof BlogApiError &&
      error.code === "rest_post_invalid_page_number"
    )
      notFound();
    throw error;
  }
  if (page > Math.max(1, collection.totalPages)) notFound();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-9">
      <nav
        aria-label="مسیر صفحه"
        className="mb-6 flex items-center gap-2 text-xs text-gray-500"
      >
        <Link href="/" className="hover:text-orange-600">
          خانه
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-gray-900">
          مجله نوین رایانه
        </span>
      </nav>
      <header className="relative overflow-hidden rounded-[2rem] border border-orange-100 bg-[#fff8f2] px-6 py-9 sm:px-10 sm:py-12">
        <BookOpenText
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-5 -left-4 size-48 -rotate-12 text-orange-100/70 sm:left-7"
          strokeWidth={0.7}
        />
        <div className="relative max-w-2xl">
          <span className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-orange-600">
            <span className="size-1.5 rounded-full bg-orange-500" />
            دنیای فناوری، از زاویه‌ای تازه
          </span>
          <h1 className="text-2xl font-black leading-10 text-gray-900 sm:text-4xl sm:leading-[1.6]">
            مجله نوین رایانه
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-8 text-gray-600">
            از تازه‌های فناوری تا بررسی و راهنمای انتخاب؛ چند دقیقه بخوانید و با
            دیدی روشن‌تر تصمیم بگیرید.
          </p>
        </div>
      </header>
      <section
        aria-label="جست‌وجو و دسته‌بندی مقاله‌ها"
        className="mt-8 rounded-2xl border border-gray-100 bg-white p-4 sm:p-5"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="دسته‌بندی مقاله‌ها" className="flex flex-wrap gap-2">
            <Link
              href={blogListPath({ search })}
              aria-current={!category ? "page" : undefined}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${!category ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-600 hover:bg-orange-50"}`}
            >
              همه مقاله‌ها
            </Link>
            {categories.map((item) => (
              <Link
                key={item.id}
                href={blogListPath({ category: item.id, search })}
                aria-current={category === item.id ? "page" : undefined}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${category === item.id ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-600 hover:bg-orange-50"}`}
              >
                {item.name}
                <span className="ms-2 opacity-60">{e2p(item.count)}</span>
              </Link>
            ))}
          </nav>
          <form
            action="/blog"
            method="get"
            role="search"
            aria-label="جست‌وجوی مقاله"
            className="flex w-full items-center rounded-xl border border-gray-200 bg-gray-50/70 px-3 focus-within:border-orange-400 lg:max-w-sm"
          >
            {category && (
              <input type="hidden" name="category" value={category} />
            )}
            <label htmlFor="blog-search" className="sr-only">
              جست‌وجو در مقاله‌ها
            </label>
            <input
              key={`${category}-${search}`}
              id="blog-search"
              name="q"
              type="search"
              maxLength={100}
              defaultValue={search}
              placeholder="دنبال چه موضوعی هستید؟"
              className="h-11 min-w-0 flex-1 bg-transparent text-xs outline-none"
            />
            <button
              aria-label="جست‌وجو"
              className="flex size-9 items-center justify-center rounded-lg text-orange-600 transition hover:bg-orange-50"
            >
              <Search aria-hidden="true" className="size-4" />
            </button>
          </form>
        </div>
      </section>
      <section aria-labelledby="blog-results-title" className="mt-9">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="blog-results-title"
            className="text-lg font-bold text-gray-900"
          >
            {search
              ? `نتایج جست‌وجو برای «${search}»`
              : activeCategory?.name || "جدیدترین خواندنی‌ها"}
          </h2>
          <p className="text-xs text-gray-500">
            {e2p(collection.total)} مقاله
            {page > 1 ? ` · صفحه ${e2p(page)}` : ""}
          </p>
        </div>
        {collection.items.length ? (
          <div className="grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {collection.items.map((post, index) => (
              <BlogCard key={post.id} post={post} eager={index === 0} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-16 text-center">
            <SearchX
              className="mx-auto mb-4 size-10 text-orange-300"
              aria-hidden="true"
            />
            <h3 className="font-bold text-gray-900">مقاله‌ای پیدا نشد</h3>
            <p className="mt-3 text-sm text-gray-500">
              عبارت دیگری را جست‌وجو کنید یا همه مقاله‌ها را ببینید.
            </p>
            <Link
              href="/blog"
              className="mt-6 inline-block rounded-xl bg-orange-500 px-5 py-3 text-xs font-bold text-white"
            >
              مشاهده همه مقاله‌ها
            </Link>
          </div>
        )}
        {collection.totalPages > 1 && (
          <nav
            aria-label="صفحه‌بندی مقاله‌ها"
            className="mt-10 flex items-center justify-center gap-3 text-xs sm:gap-6"
          >
            {page > 1 && (
              <Link
                href={blogListPath({ page: page - 1, category, search })}
                rel="prev"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-orange-300"
              >
                <ArrowRight className="size-4" />
                صفحه قبل
              </Link>
            )}
            <span aria-current="page" className="text-gray-500">
              {e2p(page)} از {e2p(collection.totalPages)}
            </span>
            {page < collection.totalPages && (
              <Link
                href={blogListPath({ page: page + 1, category, search })}
                rel="next"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-orange-300"
              >
                صفحه بعد
                <ArrowLeft className="size-4" />
              </Link>
            )}
          </nav>
        )}
      </section>
    </main>
  );
}
