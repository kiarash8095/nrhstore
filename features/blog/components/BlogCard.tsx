import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpLeft,
  CalendarDays,
  Clock3,
  ImageIcon,
  UserRound,
} from "lucide-react";
import { e2p } from "@/utils/numbers";
import type { BlogPostSummary } from "../schemas/blog.types";
import { blogListPath, blogPostPath, formatBlogDate } from "../utils/blog";

type BlogCardProps = {
  post: BlogPostSummary;
  eager?: boolean;
};

export function BlogCard({ post, eager = false }: BlogCardProps) {
  return (
    <article
      className="group relative isolate flex h-full w-full flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white transition duration-300 hover:border-orange-200 hover:shadow-[0_14px_40px_-16px_rgba(234,88,12,0.2)] focus-within:ring-2 focus-within:ring-orange-400 motion-reduce:transition-none"
      data-blog-card
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-orange-50">
        {post.image ? (
          <Image
            src={post.image.src}
            alt=""
            fill
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : undefined}
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 420px"
            className="object-cover transition duration-500 group-hover:scale-[1.04] motion-reduce:transform-none"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-orange-200">
            <ImageIcon aria-hidden="true" className="size-16" strokeWidth={1} />
          </span>
        )}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 shadow-sm">
          <Clock3 className="size-3.5 text-orange-500" aria-hidden="true" />
          {e2p(post.readingMinutes)} دقیقه مطالعه
        </span>
      </div>
      <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
        <div className="mb-3 flex min-h-6 flex-wrap items-center gap-1.5">
          {post.categories.slice(0, 2).map((category) => (
            <Link
              key={category.id}
              href={blogListPath({ category: category.id })}
              className="relative z-20 rounded-md bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700 transition hover:bg-orange-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
            >
              {category.name}
            </Link>
          ))}
        </div>
        <h3 className="text-base font-bold leading-8 text-gray-900 sm:text-[17px]">
          {/* The title link covers the card; category links sit above it. */}
          <Link
            href={blogPostPath(post.slug)}
            className="block transition after:absolute after:inset-0 after:z-10 after:rounded-3xl group-hover:text-orange-600 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-orange-500"
          >
            <span className="line-clamp-2">{post.title}</span>
          </Link>
        </h3>
        <p className="mt-2 mb-5 line-clamp-2 text-xs leading-6 text-gray-500">
          {post.excerpt}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-4 text-[11px] text-gray-500">
          <span className="inline-flex max-w-full items-center gap-1.5">
            <UserRound
              aria-hidden="true"
              className="size-3.5 shrink-0 text-gray-400"
            />
            <span className="truncate">
              {post.author?.name || "تحریریه نوین رایانه"}
            </span>
          </span>
          <time
            dateTime={post.publishedAt}
            className="inline-flex items-center gap-1.5"
          >
            <CalendarDays
              aria-hidden="true"
              className="size-3.5 text-gray-400"
            />
            {formatBlogDate(post.publishedAt)}
          </time>
        </div>
        <span
          aria-hidden="true"
          className="mt-4 inline-flex w-fit items-center gap-2 text-xs font-bold text-orange-600 transition-[gap] group-hover:gap-3 motion-reduce:transition-none"
        >
          ادامه مطلب
          <ArrowUpLeft aria-hidden="true" className="size-4" />
        </span>
      </div>
    </article>
  );
}
