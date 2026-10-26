import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { absoluteUrl } from "@/configs/site";
import { getBlogPost } from "../api/blog.service";
import { blogListPath, blogPostPath } from "../utils/blog";
import type { BlogListProps } from "../components/BlogListPage";

export async function generateBlogMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const post = await getBlogPost((await params).slug);
  if (!post) notFound();
  const images = post.image
    ? [
        {
          url: post.image.src,
          alt: post.title,
          width: post.image.width,
          height: post.image.height,
        },
      ]
    : [];
  const description = post.excerpt.slice(0, 170);
  return {
    title: post.title,
    description,
    alternates: { canonical: blogPostPath(post.slug) },
    openGraph: {
      type: "article",
      locale: "fa_IR",
      title: post.title,
      description,
      url: absoluteUrl(blogPostPath(post.slug)),
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,
      authors: post.author ? [post.author.name] : undefined,
      tags: post.tags.map((tag) => tag.name),
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: images.map((image) => image.url),
    },
  };
}

export async function generateBlogListMetadata({
  searchParams,
}: BlogListProps): Promise<Metadata> {
  const params = await searchParams;
  const page =
    typeof params.page === "string" && /^[1-9]\d{0,5}$/.test(params.page)
      ? Number(params.page)
      : 1;
  const category =
    typeof params.category === "string" &&
    /^[1-9]\d{0,8}$/.test(params.category)
      ? Number(params.category)
      : undefined;
  const search =
    typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  return {
    title: search
      ? `جست‌وجوی «${search}» در مجله`
      : `مجله نوین رایانه${page > 1 ? ` | صفحه ${page}` : ""}`,
    description:
      "اخبار فناوری، بررسی‌ها و راهنمای انتخاب در مجله نوین رایانه همدان.",
    alternates: { canonical: blogListPath({ page, category }) },
    ...(search ? { robots: { index: false, follow: true } } : {}),
  };
}
