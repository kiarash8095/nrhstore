import { getProductDetails, getProductVariations } from "@/features/products/api/products.api";
import { e2p } from "@/utils/numbers";
import { Suspense } from "react";
import { BiHappyBeaming } from "react-icons/bi";
import { FaChevronLeft } from "react-icons/fa";
import { FiHeart,FiStar } from "react-icons/fi";
import { IoTimerOutline } from "react-icons/io5";
import { LuCircleCheckBig,LuCrown } from "react-icons/lu";

import { ProductPurchase } from './ProductPurchase';
import ProductImages from "@/features/products/components/ProductImages";
import { ProductStages } from "@/features/products/components/ProductStages";
import { RelatedProducts } from "@/features/products/components/RelatedProducts";
import { ProductSectionSkeleton } from "@/features/products/components/skeletons/ProductSectionSkeleton";
import { removeExtra,shortText } from "@/utils/text";
import Link from "next/link";
import { notFound, permanentRedirect } from 'next/navigation';
import { decodeSlug, productPath } from '@/lib/urls';
import { JsonLd } from '@/components/common/JsonLd';
import { productStructuredData } from '../seo/structured-data';
import { absoluteUrl } from '@/configs/site';
import { categoryPath } from '@/lib/urls';

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  // const [stage, setStage] = useState<string[]>(stages)
  // console.log(slug)

  const product = await getProductDetails(slug);
  if (!product) notFound();
  const variations = product.type === 'variable' ? await getProductVariations(product.id) : [];
  if (decodeSlug(slug) !== decodeSlug(product.slug)) permanentRedirect(productPath(product.slug));
  // console.log(product);

  const names = ["برند", "رنگ", "پردازنده", "سری پردازنده"];
  const filteredAtts = product.attributes.filter((att) =>
    names.includes(att.name),
  );
  // console.log(filteredAtts);

  return (
    <>
      <JsonLd data={productStructuredData(product)} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'خانه', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'محصولات', item: absoluteUrl('/products') },
        ...(product.categories[0] ? [{ '@type': 'ListItem', position: 3, name: product.categories[0].name, item: absoluteUrl(categoryPath(product.categories[0].slug)) }] : []),
        { '@type': 'ListItem', position: product.categories[0] ? 4 : 3, name: removeExtra(product.name), item: absoluteUrl(productPath(product.slug)) },
      ] }} />
      {/* Breadcrumb */}
      <div className="mx-[2.5%] my-6 flex flex-wrap items-center gap-2 text-xs
       text-gray-500 sm:my-10 sm:text-sm">
        <Link href="/" className="hover:text-orange-500">
          خانه
        </Link>

        <span>/</span>

        <Link href="/products" className="hover:text-orange-500">
          محصولات
        </Link>

        <span>/</span>

        <span className="text-orange-500">
          {shortText(product?.name || slug)}
        </span>
      </div>
      <div className="mx-auto my-6 flex w-[95%] flex-col gap-4 rounded-lg bg-white p-2 sm:my-10 sm:p-3 lg:flex-row lg:gap-2">
        {/* عکس های محصول */}
        <ProductImages product={product} />
        {/* ستون دوم */}
        <div className="flex w-full flex-col justify-start items-start rounded-lg md:border-l-2
         md:border-dashed md:border-gray-300 p-2 sm:p-3 lg:w-md">
          <h1 className="text-base font-bold sm:text-lg">
            {removeExtra(product.name)}
          </h1>

          <div className="my-4 flex w-full flex-col items-start gap-3 sm:gap-4 sm:my-6 lg:w-xs">
            <div className="flex items-start gap-2">
              <FiHeart color="orange" size={16} />
              <p className="text-[9px] font-normal sm:text-[10px]">
                امتیاز {e2p(product.average_rating)} از ۵
              </p>
            </div>
            <div className="flex items-start gap-2">
              <FiStar color="orange" size={16} />
              <p className="text-[9px] font-normal sm:text-[10px]">
                {e2p(product.review_count)} دیدگاه
              </p>
            </div>
          </div>

          <p className="text-xs font-normal sm:text-sm">ویژگی ها:</p>
          <div className="my-3 flex flex-wrap justify-start gap-2 sm:gap-3 sm:my-4">
            <div className="rounded-lg bg-gray-200 p-1 sm:p-2">
              <span className="text-[10px] font-normal text-gray-400 sm:text-xs">
                برند:
              </span>
              <p className="text-[9px] font-bold text-black-400 sm:text-[11px]">
                {product?.brands[0]?.name}
              </p>
            </div>
            {filteredAtts?.map((att) => (
              <div className="rounded-lg bg-gray-200 p-1 sm:p-2" key={att?.id}>
                <span className="text-[10px] font-normal text-gray-400 sm:text-xs">
                  {att.name}:
                </span>
                <p className="text-[9px] font-bold text-black-400 sm:text-[11px]">
                  {att.terms?.[0]?.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ستون سوم */}

        <div className="w-full rounded-lg bg-gray-100 p-3 sm:p-4 lg:w-xs">
          <p className="mb-4 text-xs font-bold sm:mb-6 sm:text-sm">مشخصات</p>
          <div className="font-normal">
            <div className="flex flex-wrap items-center gap-1 border-b-1 border-dashed border-red-300 p-2 sm:p-3">
              <BiHappyBeaming size={16} className="sm:size-[19px]" />
              <p className="text-[9px] font-normal text-gray-600 sm:text-[11px]">
                رضایت از خرید
              </p>
              <FaChevronLeft size={8} color="gray" className="sm:size-[9px]" />
              <span className="text-sm font-light text-orange-400 sm:text-sm">
                {e2p(product.average_rating)} از ۵
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1 border-b-1 border-dashed border-red-300 p-2 sm:p-3">
              <IoTimerOutline size={16} className="sm:size-[19px]" />
              <p className="text-[9px] font-normal text-gray-600 sm:text-[11px]">
                زمان ارسال
              </p>
              <FaChevronLeft size={8} color="gray" className="sm:size-[9px]" />
              <span className="text-sm font-light text-orange-400 sm:text-sm">
                {e2p("3")} روز کاری
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1 border-b-1 border-dashed border-red-300 p-2 sm:p-3">
              <LuCrown size={16} className="sm:size-[19px]" />
              <p className="text-[9px] font-normal text-gray-600 sm:text-[11px]">
                دارای ضمانت
              </p>
              <FaChevronLeft size={8} color="gray" className="sm:size-[9px]" />
              <span className="text-sm font-light text-orange-400 sm:text-sm">
                بله
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1 border-b-1 border-dashed border-red-300 p-2 sm:p-3">
              <LuCircleCheckBig
                size={16}
                color="green"
                className="sm:size-[19px]"
              />
              <p className="text-[9px] font-normal text-gray-600 sm:text-[11px]">
                وضعیت موجودی
              </p>
              <FaChevronLeft size={8} color="gray" className="sm:size-[9px]" />
              {product.is_in_stock ? (
                <span className="text-sm font-light text-green-600 sm:text-sm">
                  موجود
                </span>
              ) : (
                <span className="text-sm font-light text-green-600 sm:text-sm">
                  ناموجود
                </span>
              )}
            </div>

            <ProductPurchase product={product} variations={variations} />
          </div>
        </div>
      </div>

      {/* info divs */}
      <ProductStages product={product} />

      {/* Related Products component */}
      <Suspense fallback={<ProductSectionSkeleton />}>
        <RelatedProducts product={product} />
      </Suspense>

    </>
  );
}
