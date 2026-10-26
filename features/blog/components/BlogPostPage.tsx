import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  BookOpenText,
  CalendarDays,
  Clock3,
  FolderOpen,
  ImageIcon,
  List,
  MessageSquareText,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { JsonLd } from "@/components/common/JsonLd";
import { absoluteUrl, site } from "@/configs/site";
import { e2p } from "@/utils/numbers";
import { getBlogPost, getRelatedBlogPosts } from "../api/blog.service";
import type { BlogPost } from "../schemas/blog.types";
import { blogListPath, blogPostPath, formatBlogDate } from "../utils/blog";
import { BlogCard } from "./BlogCard";
import { BlogShareButton } from "./BlogShareButton";
import { BlogComments } from "./blog_comments/BlogComments";
import styles from "./article.module.css";

async function RelatedArticles({ post }: { post: BlogPost }) {
  let posts;
  try {
    posts = await getRelatedBlogPosts(post);
  } catch {
    return null;
  }
  if (!posts.length) return null;
  return (
    <section className="mt-12" aria-labelledby="related-articles-title">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="related-articles-title"
          className="flex items-center gap-2 text-xl font-bold text-gray-900"
        >
          <BookOpenText className="size-5 text-orange-500" aria-hidden="true" />
          این مقاله‌ها را هم بخوانید
        </h2>
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-xs font-bold text-orange-600"
        >
          همه مقاله‌ها
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((item) => (
          <BlogCard key={item.id} post={item} />
        ))}
      </div>
    </section>
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const post = await getBlogPost((await params).slug);
  if (!post) notFound();
  const path = blogPostPath(post.slug);
  const updated = post.modifiedAt !== post.publishedAt;
  const facts = [
    {
      label: "زمان مطالعه",
      icon: Clock3,
      value: `حدود ${e2p(post.readingMinutes)} دقیقه`,
    },
    {
      label: "تاریخ انتشار",
      icon: CalendarDays,
      value: (
        <time dateTime={post.publishedAt}>
          {formatBlogDate(post.publishedAt)}
        </time>
      ),
    },
    ...(updated
      ? [
          {
            label: "آخرین به‌روزرسانی",
            icon: RefreshCw,
            value: (
              <time dateTime={post.modifiedAt}>
                {formatBlogDate(post.modifiedAt)}
              </time>
            ),
          },
        ]
      : []),
    {
      label: "نویسنده",
      icon: UserRound,
      value: post.author?.name || "تحریریه نوین رایانه",
    },
  ];
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-9">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          image: post.image ? [post.image.src] : undefined,
          datePublished: post.publishedAt,
          dateModified: post.modifiedAt,
          author: {
            "@type": post.author ? "Person" : "Organization",
            name: post.author?.name || site.name,
          },
          publisher: {
            "@type": "Organization",
            name: site.name,
            url: site.url,
          },
          mainEntityOfPage: absoluteUrl(path),
          inLanguage: "fa-IR",
          articleSection: post.categories.map((category) => category.name),
          timeRequired: `PT${post.readingMinutes}M`,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "خانه",
              item: absoluteUrl("/"),
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "مجله نوین رایانه",
              item: absoluteUrl("/blog"),
            },
            {
              "@type": "ListItem",
              position: 3,
              name: post.title,
              item: absoluteUrl(path),
            },
          ],
        }}
      />
      <nav
        aria-label="مسیر صفحه"
        className="mb-6 flex min-w-0 items-center gap-2 text-[11px] text-gray-500 sm:text-xs"
      >
        <Link href="/" className="shrink-0 hover:text-orange-600">
          خانه
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/blog" className="shrink-0 hover:text-orange-600">
          مجله
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="truncate text-gray-800">
          {post.title}
        </span>
      </nav>
      <article>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-stretch">
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-orange-50 sm:aspect-[16/9] lg:aspect-auto lg:min-h-[400px]">
            {post.image ? (
              <Image
                src={post.image.src}
                alt={post.image.alt || post.title}
                fill
                sizes="(max-width: 1024px) 95vw, 900px"
                preload
                className="object-cover"
              />
            ) : (
              <div className="flex h-full min-h-72 items-center justify-center text-orange-200">
                <ImageIcon
                  className="size-24"
                  strokeWidth={1}
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
          <aside
            aria-label="اطلاعات مقاله"
            className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6"
          >
            <p className="mb-5 text-sm font-bold text-gray-900">
              پیش از مطالعه
            </p>
            <dl className="grid grid-cols-2 gap-5 lg:grid-cols-1">
              {facts.map(({ label, icon: Icon, value }) => (
                <div key={label} className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-orange-500">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[10px] text-gray-400">{label}</dt>
                    <dd className="mt-1 break-words text-xs font-medium leading-6 text-gray-800">
                      {value}
                    </dd>
                  </div>
                </div>
              ))}
              <div className="col-span-2 flex items-start gap-3 lg:col-span-1">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-orange-500">
                  <FolderOpen className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-[10px] text-gray-400">دسته‌بندی</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {post.categories.length ? (
                      post.categories.map((category) => (
                        <Link
                          href={blogListPath({ category: category.id })}
                          key={category.id}
                          className="rounded-md bg-orange-50 px-2 py-1 text-[10px] font-medium text-orange-700 hover:bg-orange-100"
                        >
                          {category.name}
                        </Link>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">عمومی</span>
                    )}
                  </dd>
                </div>
              </div>
            </dl>
            <BlogShareButton />
            <a
              href="#blog-comments"
              className="mt-3 inline-flex items-center gap-2 text-xs text-gray-500 hover:text-orange-600"
            >
              <MessageSquareText className="size-4" aria-hidden="true" />
              دیدگاه خوانندگان
            </a>
          </aside>
        </div>
        <div className="mt-8 grid items-start gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 overflow-hidden rounded-3xl border border-gray-100 bg-white px-5 py-7 sm:px-10 sm:py-10">
            <div className="mb-8 border-b border-gray-100 pb-7">
              <p className="mb-3 text-xs font-bold text-orange-600">
                مجله نوین رایانه / {post.categories[0]?.name || "خواندنی‌ها"}
              </p>
              <h1 className="text-2xl font-black leading-[1.9] text-gray-900 sm:text-3xl">
                {post.title}
              </h1>
            </div>
            <div
              className={styles.content}
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />
            {post.tags.length > 0 && (
              <div
                className="mt-9 flex flex-wrap gap-2 border-t border-gray-100 pt-6"
                aria-label="برچسب‌های مقاله"
              >
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={blogListPath({ search: tag.name })}
                    className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 hover:bg-orange-50 hover:text-orange-700"
                  >
                    # {tag.name}
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-10 flex items-center justify-between gap-3 rounded-2xl bg-[#fff8f2] px-4 py-5">
              <p className="text-xs leading-7 text-gray-600">
                این مطلب برایتان جالب بود؟
                <br />
                <span className="font-bold text-gray-900">
                  خواندنی‌های بیشتری در مجله منتظر شماست.
                </span>
              </p>
              <Link
                href="/blog"
                className="inline-flex shrink-0 items-center gap-2 text-xs font-bold text-orange-600"
              >
                مجله
                <ArrowLeft className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="order-first lg:sticky lg:top-28 lg:order-none">
            {post.headings.length > 0 && (
              <nav
                aria-label="فهرست محتوای مقاله"
                className="rounded-2xl border border-gray-100 bg-white p-5"
              >
                <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
                  <List className="size-4 text-orange-500" aria-hidden="true" />
                  در این مقاله می‌خوانید
                </h2>
                <ol className="max-h-96 space-y-3 overflow-y-auto">
                  {post.headings.map((heading) => (
                    <li
                      key={heading.id}
                      className={heading.level > 2 ? "ps-3" : ""}
                    >
                      <a
                        href={`#${heading.id}`}
                        className="block border-s-2 border-gray-100 ps-3 text-xs leading-7 text-gray-500 transition hover:border-orange-400 hover:text-orange-600"
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </div>
        </div>
      </article>
      <div className="mt-8 max-w-[900px]">
        <BlogComments
          postId={post.id}
          commentsOpen={post.commentsOpen}
          nextPath={`${path}#blog-comments`}
        />
      </div>
      <Suspense
        fallback={
          <p className="mt-10 text-xs text-gray-400" role="status">
            در حال دریافت مقاله‌های مرتبط…
          </p>
        }
      >
        <RelatedArticles post={post} />
      </Suspense>
    </main>
  );
}
