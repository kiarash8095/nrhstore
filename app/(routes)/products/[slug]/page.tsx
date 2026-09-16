import { getProductDetails } from "@/services/products";
import Image from "next/image";
import { Suspense } from "react";
import { e2p, sp } from "@/utils/numbers";
import ToomaanIcon from "@/components/icons/ToomaanIcon";
import { FiPlus } from "react-icons/fi";
import { FiHeart } from "react-icons/fi";
import { FiStar } from "react-icons/fi";
import { BiHappyBeaming } from "react-icons/bi";
import { IoTimerOutline } from "react-icons/io5";
import { LuCrown } from "react-icons/lu";
import { LuCircleCheckBig } from "react-icons/lu";
import { FaChevronLeft } from "react-icons/fa";

import Link from "next/link";
import { removeExtra, shortText } from "@/utils/shortText";
import ProductImages from "@/components/modules/productPage/ProductImages";
import { RelatedProducts } from "@/components/modules/productPage/RelatedProducts";
import { ProductStages } from "@/components/modules/productPage/ProductStages";
import MobileMenu from "@/components/layout/mobileMenu";
import { ProductSectionSkeleton } from "@/components/skeleton";

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
  // console.log(product);
  const productCategory = product.categories[0].name;

  const names = ["برند", "رنگ", "پردازنده", "سری پردازنده"];
  const filteredAtts = product.attributes.filter((att) =>
    names.includes(att.name),
  );
  // console.log(filteredAtts);

  return (
    <>
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
          <p className="text-base font-bold sm:text-lg">
            {removeExtra(product.name)}
          </p>

          <div className="my-4 flex w-full flex-col items-start gap-3 sm:gap-4 sm:my-6 lg:w-xs">
            <div className="flex items-start gap-2">
              <FiHeart color="orange" size={16} />
              <p className="text-[9px] font-normal sm:text-[10px]">
                {e2p(product.average_rating)}% از کاربران این کالا را دوست
                داشتند
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
                {e2p(product.average_rating)}%
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

            <div className="my-6 flex flex-col sm:my-10">
              <div className="my-3 sm:my-5">
                <span className="flex gap-1 text-lg font-normal sm:text-2xl">
                  {sp(product.prices.price)} <ToomaanIcon />
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 max-md:hidden">
                <button
                  className="flex items-center justify-center gap-2 rounded-md
                         bg-black px-2 py-2 text-xs text-white transition duration-300 
                         hover:bg-orange-600 sm:px-3 sm:py-2 sm:gap-3 sm:text-sm"
                >
                  افزودن به سبد خرید{" "}
                  <FiPlus size={16} className="sm:size-[18px]" />
                </button>
                <button
                  className="flex items-center justify-center rounded-lg border border-2 border-gray-400
                 bg-gray-300 p-2 transition duration-300 hover:border-orange-400 hover:bg-orange-300 sm:p-4"
                >
                  <FiHeart color="gray" size={20} className="sm:size-[25px]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* info divs */}
      <ProductStages product={product} />

      {/* Related Products component */}
      <Suspense fallback={<ProductSectionSkeleton />}>
        <RelatedProducts product={product} />
      </Suspense>

      <MobileMenu
        cart={
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl
             bg-black px-4 py-3 text-sm font-bold text-white transition duration-300
             hover:bg-orange-600 active:scale-[0.99] focus-visible:outline-2
             focus-visible:outline-offset-2 focus-visible:outline-orange-500"
          >
            افزودن به سبد خرید <FiPlus size={18} />
          </button>
        }
      />
    </>
  );
}
