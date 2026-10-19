"use client";
import Image from "next/image";
import Link from "next/link";
import { Package, Trash2 } from "lucide-react";
import type { WooCommerceCartItem } from "../contracts";
import { cartItemPath, cartText, money } from "../utils/cart.utils";
import { CartItemQuantity } from "./CartItemQuantity";
export function CartItem({
  item,
  busy,
  compact = false,
  onUpdate,
  onRemove,
}: {
  item: WooCommerceCartItem;
  busy: boolean;
  compact?: boolean;
  onUpdate: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <article
      data-testid="cart-item"
      className="flex gap-4 border-b border-gray-100 py-5 last:border-0"
    >
      <Link
        href={cartItemPath(item)}
        className={
          "relative shrink-0 self-start rounded-xl border border-gray-100 bg-white p-2 " +
          (compact ? "size-20" : "size-24 sm:size-32")
        }
      >
        {item.images[0]?.src ? (
          <Image
            fill
            sizes={compact ? "80px" : "128px"}
            src={item.images[0].src}
            alt={cartText(item.name)}
            className="object-contain p-2"
          />
        ) : (
          <Package className="size-full p-3 text-gray-300" />
        )}
      </Link>
      <div className="min-w-0 flex-1 space-y-3">
        <Link
          href={cartItemPath(item)}
          className="block text-sm font-bold leading-7 hover:text-orange-600"
        >
          {cartText(item.name)}
        </Link>
        {!!item.variation?.length && (
          <p className="text-xs leading-6 text-gray-500">
            {item.variation
              .map(
                (value) =>
                  cartText(value.attribute) + ": " + cartText(value.value),
              )
              .join("، ")}
          </p>
        )}
        {item.item_data?.map((data, index) => (
          <p key={index} className="text-xs leading-6 text-gray-500">
            {cartText(data.key)}: {cartText(data.display || data.value)}
          </p>
        ))}
        {item.backorders_allowed && (
          <p className="text-xs text-amber-700">امکان پیش‌خرید</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CartItemQuantity item={item} busy={busy} onChange={onUpdate} />
            <button
              type="button"
              disabled={busy}
              onClick={onRemove}
              aria-label={"حذف " + item.name}
              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          <div className="text-left">
            {item.totals.line_subtotal !== item.totals.line_total && (
              <del className="block text-xs text-gray-400">
                {money(item.totals.line_subtotal, item.totals)}
              </del>
            )}
            <p className="text-sm font-bold">
              {money(item.totals.line_total, item.totals)}
            </p>
          </div>
        </div>
        {!compact &&
          (!item.quantity_limits.editable ||
            item.quantity_limits.maximum <= 20) && (
            <p className="text-[11px] text-gray-400">
              {item.quantity_limits.editable
                ? "حداکثر تعداد مجاز: " +
                  item.quantity_limits.maximum.toLocaleString("fa-IR")
                : "تعداد این کالا ثابت است"}
            </p>
          )}
      </div>
    </article>
  );
}
