import { getProductDetails, getProductVariations } from "@/features/products/api/products.api";
import { Suspense } from "react";
import { FiStar } from "react-icons/fi";

import { ProductPurchase } from "./ProductPurchase";
import ProductImages from "@/features/products/components/ProductImages";
import { ProductStages } from "@/features/products/components/ProductStages";
import { RelatedProducts } from "@/features/products/components/RelatedProducts";
import { ProductSectionSkeleton } from "@/features/products/components/skeletons/ProductSectionSkeleton";
import { ShopDetails } from "@/features/products/components/ShopDetails";
import { removeExtra, shortText } from "@/utils/text";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { decodeSlug, productPath } from "@/lib/urls";
import { JsonLd } from "@/components/common/JsonLd";
import { productStructuredData } from "../seo/structured-data";
import { absoluteUrl } from "@/configs/site";
import { categoryPath } from "@/lib/urls";
import { e2p } from "@/utils/numbers";
import { FavoriteButton } from '@/features/user-panel';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductDetails(slug);

  if (!product) notFound();
  const variations = product.type === "variable" ? await getProductVariations(product.id) : [];
  if (decodeSlug(slug) !== decodeSlug(product.slug)) permanentRedirect(productPath(product.slug));

  const highlightedAttributes = product.attributes
    .filter(attribute => ["برند", "رنگ", "پردازنده", "سری پردازنده"].includes(attribute.name))
    .slice(0, 4);
  const brand = product.brands[0]?.name;
  const category = product.categories[0];

  return (
    <>
      <JsonLd data={productStructuredData(product)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "خانه", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "محصولات", item: absoluteUrl("/products") },
            ...(category ? [{ "@type": "ListItem", position: 3, name: category.name, item: absoluteUrl(categoryPath(category.slug)) }] : []),
            { "@type": "ListItem", position: category ? 4 : 3, name: removeExtra(product.name), item: absoluteUrl(productPath(product.slug)) },
          ],
        }}
      />

      <nav aria-label="مسیر صفحه" className="mx-[2.5%] my-5 flex flex-wrap items-center gap-2 text-xs text-gray-500 sm:my-8 sm:text-sm">
        <Link href="/" className="transition hover:text-orange-500">خانه</Link>
        <span aria-hidden="true">/</span>
        <Link href="/products" className="transition hover:text-orange-500">محصولات</Link>
        {category && (
          <>
            <span aria-hidden="true">/</span>
            <Link href={categoryPath(category.slug)} className="transition hover:text-orange-500">{category.name}</Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="max-w-full truncate text-orange-600">{shortText(product.name)}</span>
      </nav>

      <section aria-labelledby="product-title" className="mx-auto my-5 w-[95%] rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:my-8 sm:p-5 lg:p-6">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-8">
          <ProductImages product={product} />

          <div className="min-w-0">
            <div className="border-b border-gray-100 pb-5">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {brand && <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-700">برند: {brand}</span>}
                {category && <span className="rounded-full bg-gray-100 px-3 py-1">{category.name}</span>}
              </div>

              <h1 id="product-title" className="text-xl font-black leading-9 text-gray-900 sm:text-2xl">
                {removeExtra(product.name)}
              </h1>
              <FavoriteButton productId={product.id} />

              <a href="#product-reviews" className="mt-3 inline-flex items-center gap-2 rounded-lg text-sm text-gray-600 transition hover:text-orange-600 focus-visible:outline-2 focus-visible:outline-orange-500">
                <FiStar className="size-4 fill-orange-400 text-orange-400" aria-hidden="true" />
                <span>{e2p(product.average_rating)} از ۵</span>
                <span className="text-gray-300">•</span>
                <span>{e2p(product.review_count)} دیدگاه</span>
              </a>

              {highlightedAttributes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {highlightedAttributes.map(attribute => (
                    <span key={attribute.id || attribute.name} className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600 ring-1 ring-gray-100">
                      <span className="text-gray-400">{attribute.name}: </span>
                      <strong className="font-semibold text-gray-800">{attribute.terms[0]?.name || "-"}</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <ProductPurchase product={product} variations={variations} />
            <ShopDetails product={product} />
          </div>
        </div>
      </section>

      <ProductStages product={product} />

      <Suspense fallback={<ProductSectionSkeleton />}>
        <RelatedProducts product={product} />
      </Suspense>
    </>
  );
}
