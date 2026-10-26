import { notFound, permanentRedirect } from "next/navigation";
import { decodeSlug, parsePage } from "@/lib/urls";
import { getBlogCategories } from "../api/blog.service";
import { blogListPath, validBlogSlug } from "../utils/blog";

/** Preserve existing WordPress category links while keeping one canonical archive. */
export async function BlogCategoryRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[]; q?: string | string[] }>;
}) {
  const { slug } = await params;
  if (!validBlogSlug(slug)) notFound();
  const query = await searchParams;
  const page = parsePage(query.page);
  const search =
    query.q === undefined
      ? ""
      : typeof query.q === "string"
        ? query.q.trim()
        : null;
  if (
    !page ||
    search === null ||
    search.length > 100 ||
    /[\u0000-\u001f]/.test(search)
  )
    notFound();
  const category = (await getBlogCategories()).find(
    (item) => decodeSlug(item.slug) === decodeSlug(slug),
  );
  if (!category) notFound();
  permanentRedirect(blogListPath({ category: category.id, page, search }));
}
