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
import { Products } from "@/types/products";

interface ShopDetailsProps {
  product: Products;
}
export function ShopDetails({ product }: ShopDetailsProps) {
  return (
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
      </div>
    </div>
  );
}
