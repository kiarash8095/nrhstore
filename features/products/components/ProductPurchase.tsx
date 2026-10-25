"use client";

import { useState } from "react";
import MobileNavigation from "@/components/layout/MobileNavigation";
import { AddToCartButton } from "@/features/cart";
import { money } from "@/features/cart/display";
import type { Products } from "../types/product.types";

export function ProductPurchase({ product, variations }: { product: Products; variations: Products[] }) {
  const attributes = product.attributes.filter(attribute => attribute.has_variations);
  const [selection, setSelection] = useState<Record<string, string>>(() => Object.fromEntries(
    attributes.map(attribute => [attribute.name, attribute.terms.find(term => term.default)?.slug || ""]),
  ));
  const variable = product.type === "variable";
  const match = variable && attributes.every(attribute => selection[attribute.name])
    ? product.variations?.find(variation => variation.attributes.every(attribute => !attribute.value || attribute.value === selection[attribute.name]))
    : undefined;
  const selected = variable ? variations.find(variation => variation.id === match?.id) : product;
  const available = !!selected && selected.is_in_stock && selected.is_purchasable !== false && (selected.type === undefined || ["simple", "variation"].includes(selected.type));
  const item = {
    id: selected?.id || product.id,
    quantity: selected?.add_to_cart?.minimum || 1,
    ...(variable ? { variation: attributes.map(attribute => ({ attribute: attribute.taxonomy || attribute.name, value: selection[attribute.name] || "" })) } : {}),
  };

  return (
    <div className="mt-5 space-y-4">
      {attributes.length > 0 && (
        <section aria-label="انتخاب تنوع محصول" className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-800">انتخاب مدل</h2>
              <p className="mt-0.5 text-[11px] text-gray-500">مدل موردنظر خود را انتخاب کنید.</p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] text-gray-400 ring-1 ring-gray-100">ضروری</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {attributes.map(attribute => (
              <label key={attribute.id || attribute.name} className="block text-xs font-bold text-gray-700">
                {attribute.name}
                <select
                  aria-label={`انتخاب ${attribute.name}`}
                  value={selection[attribute.name] || ""}
                  onChange={event => setSelection(current => ({ ...current, [attribute.name]: event.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="">انتخاب کنید</option>
                  {attribute.terms.map(term => <option key={term.slug} value={term.slug}>{term.name}</option>)}
                </select>
              </label>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-end justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <p className="text-xs text-gray-500">قیمت نهایی</p>
          <p data-testid="purchase-price" className="mt-1 text-2xl font-black tracking-tight text-gray-900">{money((selected || product).prices.price, (selected || product).prices)}</p>
        </div>
        <span className={available ? "rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700" : "rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700"}>
          {available ? "موجود" : "ناموجود"}
        </span>
      </div>

      {!available && (
        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-6 text-amber-800">
          {variable && !selected ? "برای ادامه، ابتدا تنوع محصول را انتخاب کنید." : "این محصول در حال حاضر قابل خرید نیست."}
        </p>
      )}

      <div className="hidden lg:block">
        <AddToCartButton item={item} disabled={!available} />
      </div>
      <MobileNavigation cart={<AddToCartButton item={item} disabled={!available} />} />
    </div>
  );
}
