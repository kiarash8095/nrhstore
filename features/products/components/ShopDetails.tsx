import { Products } from "@/features/products/types/product.types";
import { e2p } from "@/utils/numbers";
import { BiHappyBeaming } from "react-icons/bi";
import { IoTimerOutline } from "react-icons/io5";
import { LuCircleCheckBig, LuCrown } from "react-icons/lu";

interface ShopDetailsProps {
  product: Products;
}

export function ShopDetails({ product }: ShopDetailsProps) {
  const details = [
    {
      icon: BiHappyBeaming,
      label: "رضایت خریداران",
      value: `${e2p(product.average_rating)} از ۵`,
      tone: "text-orange-500",
    },
    {
      icon: IoTimerOutline,
      label: "ارسال",
      value: "۳ روز کاری",
      tone: "text-orange-500",
    },
    {
      icon: LuCrown,
      label: "ضمانت",
      value: "اصلی",
      tone: "text-orange-500",
    },
    {
      icon: LuCircleCheckBig,
      label: "وضعیت کالا",
      value: product.is_in_stock ? "موجود" : "ناموجود",
      tone: product.is_in_stock ? "text-emerald-600" : "text-red-500",
    },
  ];

  return (
    <section aria-label="اطمینان از خرید" className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-gray-800">اطمینان از خرید</h2>
        <span className="text-[11px] text-gray-400">اطلاعات محصول</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {details.map(({ icon: Icon, label, value, tone }) => (
          <div key={label} className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-2.5 py-2.5 ring-1 ring-gray-100">
            <Icon className={`size-4 shrink-0 ${tone}`} aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-[10px] text-gray-500">{label}</p>
              <p className={`truncate text-xs font-bold ${tone}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
