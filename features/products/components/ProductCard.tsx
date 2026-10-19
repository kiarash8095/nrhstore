import { ArrowLeft,ImageOff,Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { productPath } from '@/lib/urls';

import { Card,CardContent } from "@/components/ui/card";
import type { Products } from "@/features/products/types/product.types";
import { sp } from "@/utils/numbers";

interface ProductCardProps {
  product: Products;
}

const namedEntities: Record<string, string> = {
  amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: "\u00a0",
  ndash: "–", mdash: "—", hellip: "…", times: "×",
};

function readableProductName(value: string) {
  // Decode WordPress text as plain text; never render product names as HTML.
  return value.replace(/&(?:#(\d{1,7})|#x([\da-f]{1,6})|([a-z]+));/gi, (entity, decimal, hex, named) => {
    if (named) return namedEntities[named.toLowerCase()] || entity;
    const code = Number.parseInt(decimal || hex, decimal ? 10 : 16);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : entity;
  });
}

export function ProductCard({ product }: ProductCardProps) {
  const image = product.images[0]?.src;
  const name = readableProductName(product.name);
  const price = sp(product.prices.price);
  const rating = Number(product.average_rating);
  const hasRating = product.review_count > 0 && Number.isFinite(rating) && rating > 0 && rating <= 5;
  const formattedRating = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(rating);

  return (
    <Card
      className="group h-[28.25rem] w-full min-w-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white py-0 shadow-sm ring-0 transition-[border-color,box-shadow] duration-200 hover:border-orange-300 hover:shadow-md motion-reduce:transition-none sm:h-[29.5rem]"
    >
      <Link
        href={productPath(product.slug)}
        aria-label={`مشاهده محصول ${name}`}
        className="flex h-full min-w-0 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset"
      >
        <CardContent className="flex h-full min-w-0 flex-col p-4">
          <div className="flex h-6 shrink-0 items-center justify-between gap-2 text-xs">
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${product.is_in_stock ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              {product.is_in_stock ? "موجود" : "ناموجود"}
            </span>
            {hasRating ? (
              <span
                className="inline-flex min-w-0 items-center gap-1 text-gray-600"
                aria-label={`امتیاز ${formattedRating} از ۵، ${sp(product.review_count)} دیدگاه`}
              >
                <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden="true" />
                <span className="font-semibold tabular-nums">{formattedRating}</span>
                <span className="truncate text-[11px] text-gray-500">({sp(product.review_count)})</span>
              </span>
            ) : (
              <span className="text-[11px] text-gray-500">بدون دیدگاه</span>
            )}
          </div>

          <div className="relative my-4 h-44 w-full shrink-0 overflow-hidden rounded-xl bg-gray-50 sm:h-48">
            {image ? (
              <Image
                src={image}
                fill
                sizes="(min-width: 1280px) 280px, (min-width: 1024px) 25vw, (min-width: 640px) 45vw, 85vw"
                alt={name}
                className="object-contain p-3 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                <ImageOff className="size-10" aria-hidden="true" />
                <span className="text-xs text-gray-500">تصویر محصول ثبت نشده</span>
              </div>
            )}
          </div>

          <h3
            title={name}
            dir="auto"
            className="line-clamp-3 h-18 shrink-0 text-start text-sm leading-6 font-semibold text-gray-800 [overflow-wrap:anywhere] sm:text-[15px]"
          >
            {name}
          </h3>

          <div className="mt-auto min-w-0 border-t border-gray-100 pt-3">
            <div className="mb-3 flex h-7 min-w-0 items-baseline justify-end gap-1.5">
              {price ? (
                <>
                  <span dir="ltr" title={`${price} تومان`} className="truncate text-lg leading-7 font-bold text-gray-900 tabular-nums">
                    {price}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500">تومان</span>
                </>
              ) : (
                <span className="text-sm leading-7 font-semibold text-gray-600">استعلام قیمت</span>
              )}
            </div>
            <span
              className="flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-orange-200 bg-orange-50 text-sm font-semibold text-orange-700 transition-colors group-hover:border-orange-600 group-hover:bg-orange-600 group-hover:text-white group-focus-within:border-orange-600 group-focus-within:bg-orange-600 group-focus-within:text-white motion-reduce:transition-none"
            >
              مشاهده محصول
              <ArrowLeft className="size-4" aria-hidden="true" />
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
