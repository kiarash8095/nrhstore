import { getProductDetails } from "@/services/products";
import Image from "next/image";
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
interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}


export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  // console.log(slug)
  
  const product = await getProductDetails(slug);
  console.log(product);



  const names = ["برند", "رنگ", "پردازنده", "سری پردازنده"];
  const filteredAtts = product.attributes.filter((att) =>
    names.includes(att.name),
  );
  console.log(filteredAtts);

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 m-10">
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
      <div className="flex gap-2 w-[95%] m-auto my-10 p-3 bg-white rounded-lg">
        {/* عکس های محصول */}
        <ProductImages product={product} />
        {/* ستون دوم */}
        <div className="w-md p-3 border-l-2 border-dashed border-gray-300 rounded-lg flex flex-col justify-start items-start">
          <p className="text-lg font-bold">{removeExtra(product.name)}</p>

          <div className="flex flex-col items-start gap-4 w-xs my-6">
            <div className="flex items-start gap-2">
              <FiHeart color="orange" size={16} />
              <p className="text-[10px] font-normal">
                {e2p(product.average_rating)}% از کاربران این کالا را دوست
                داشتند
              </p>
            </div>
            <div className="flex items-start gap-2">
              <FiStar color="orange" size={16} />
              <p className="text-[10px] font-normal">
                {e2p(product.review_count)} دیدگاه
              </p>
            </div>
          </div>

          <p className="font-normal text-sm">ویژگی ها:</p>
          <div className="flex justify-start gap-2 my-4">
            <div className="p-2 rounded-lg bg-gray-200">
              <span className="text-gray-400 font-normal text-xs">برند:</span>
              <p className="text-[11px] text-black-400 font-bold">
                {product.brands[0].name}
              </p>
            </div>
            {filteredAtts?.map((att) => (
              <div className="p-2 rounded-lg bg-gray-200">
                <span className="text-gray-400 font-normal text-xs">
                  {att.name}:
                </span>
                <p className="text-[11px] text-black-400 font-bold">
                  {att.terms?.[0]?.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ستون سوم */}

        <div className="w-xs p-4 bg-gray-100 rounded-lg">
          <p className="font-bold text-sm mb-6">مشخصات</p>
          <div className="font-normal">
            <div className="flex items-center gap-1 p-3 border-b-1 border-dashed border-red-300">
              <BiHappyBeaming size={19}/>
              <p className="text-[11px] font-normal text-gray-600">رضایت از خرید</p>
              <FaChevronLeft size={9} color="gray" className=""/>
              <span className="text-orange-400 font-light text-sm">{e2p(product.average_rating)}%</span>
            </div>

            <div className="flex items-center gap-1 p-3 border-b-1 border-dashed border-red-300">
              <IoTimerOutline size={19}/>
              <p className="text-[11px] font-normal text-gray-600">زمان ارسال</p>
              <FaChevronLeft size={9} color="gray" className=""/>
              <span className="text-orange-400 font-light text-sm">{e2p("3")} روز کاری</span>
            </div>

            <div className="flex items-center gap-1 p-3 border-b-1 border-dashed border-red-300">
              <LuCrown size={19}/>
              <p className="text-[11px] font-normal text-gray-600">دارای ضمانت</p>
              <FaChevronLeft size={9} color="gray" className=""/>
              <span className="text-orange-400 font-light text-sm">بله</span>
            </div>
            <div className="flex items-center gap-1 p-3 border-b-1 border-dashed border-red-300">
              <LuCircleCheckBig size={19} color="green"/>
              <p className="text-[11px] font-normal text-gray-600">وضعیت موجودی</p>
              <FaChevronLeft size={9} color="gray" className=""/>
              {product.is_in_stock ? <span className="text-green-600 font-light text-sm">موجود</span> : <span className="text-green-600 font-light text-sm">ناموجود</span>}
            </div>

            <div className="flex flex-col my-10">
              <div className="my-5">
                <span className="flex gap-1 text-2xl font-normal">
                  {sp(product.prices.price)} <ToomaanIcon />
                </span>
              </div>
              <div className="flex gap-4">
                <button
                  className="flex items-center gap-3 px-3 py-2 rounded-md
                         bg-black text-white cursor-pointer transition duration-300
                         hover:bg-orange-600"
                >
                  افزودن به سبد خرید <FiPlus />
                </button>
                <button className="p-4 bg-gray-300 rounded-lg border border-2 border-gray-400
                 cursor-pointer transition duration-300 hover:bg-orange-300 hover:border-orange-400">
                  <FiHeart color="gray" size={25} className="" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
