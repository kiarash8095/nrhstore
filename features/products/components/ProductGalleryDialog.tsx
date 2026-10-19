"use client";

import Image from "next/image";
import { useCallback,useRef,useState,type ReactElement } from "react";
import { FiMinus,FiPlus } from "react-icons/fi";
import { LuRotateCcw,LuX } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import {
Dialog,
DialogClose,
DialogContent,
DialogDescription,
DialogHeader,
DialogTitle,
DialogTrigger,
} from "@/components/ui/dialog";
import { useImageZoom } from "@/features/products/hooks/use-image-zoom";
import type { ProductImage } from "@/features/products/types/product.types";
import { cn } from "@/lib/utils";
import { e2p } from "@/utils/numbers";

interface ProductGalleryDialogProps {
  images: ProductImage[];
  productName: string;
  /** تصویری که همین حالا در صفحه‌ی محصول نمایش داده می‌شود */
  activeSrc: string;
  onSelect: (src: string) => void;
  trigger: ReactElement;
}

export function ProductGalleryDialog({
  images,
  productName,
  activeSrc,
  onSelect,
  trigger,
}: ProductGalleryDialogProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // نود قاب در state نگه داشته می‌شود تا با سوار شدن مودال، رویدادهای بومی دوباره وصل شوند
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
  const attachContainer = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainerNode(node);
  }, []);

  const zoom = useImageZoom({
    containerRef,
    containerNode,
    minScale: 1,
    maxScale: 4,
    step: 0.5,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    // با هر بار بستن، بزرگ‌نمایی به حالت اولیه برمی‌گردد
    if (!nextOpen) zoom.reset();
  };

  const handleSelect = (src: string) => {
    onSelect(src);
    zoom.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />

      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92dvh] w-[96vw] max-w-[68rem] flex-col gap-3 overflow-hidden rounded-3xl p-3 sm:max-w-[68rem] sm:gap-5 sm:p-5"
      >
        <DialogHeader className="flex-row items-center justify-between gap-3">
          <DialogTitle className="text-sm font-bold text-gray-900 sm:text-lg">
            گالری تصاویر
          </DialogTitle>

          <DialogClose
            render={
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-full text-xs sm:text-sm"
              />
            }
          >
            <LuX className="size-3.5" aria-hidden="true" />
            بستن
          </DialogClose>
        </DialogHeader>

        <DialogDescription className="sr-only">
          تصاویر محصول {productName}. با دکمه‌های مثبت و منفی بزرگ‌نمایی کنید و
          تصویر را بکشید تا بخش‌های دیگر آن را ببینید.
        </DialogDescription>

        <div className="flex min-h-0 flex-1 flex-col gap-3 sm:flex-row sm:gap-4">
          {/* تصویر بزرگ + کنترل‌های بزرگ‌نمایی */}
          <div className="order-1 flex min-h-0 min-w-0 flex-1 flex-col sm:order-2">
            <div
              ref={attachContainer}
              {...zoom.containerHandlers}
              tabIndex={0}
              role="group"
              aria-label={`تصویر بزرگ ${productName}`}
              style={{ touchAction: zoom.isZoomed ? "none" : "pan-y" }}
              className={cn(
                "relative flex h-[45vh] w-full items-center justify-center overflow-hidden rounded-2xl bg-gray-50 select-none sm:h-[62vh]",
                "focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none",
                zoom.isZoomed
                  ? zoom.isPanning
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "cursor-zoom-in",
              )}
            >
              <Image
                src={activeSrc}
                alt={productName}
                width={1200}
                height={1200}
                sizes="(max-width: 640px) 92vw, 60vw"
                onLoad={zoom.handleImageLoad}
                draggable={false}
                style={zoom.imageStyle}
                className={cn(
                  "h-full w-full object-contain will-change-transform",
                  !zoom.isPanning && "transition-transform duration-200 ease-out",
                )}
              />
            </div>

            {/* نوار کنترل بزرگ‌نمایی */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
              <div className="flex items-center gap-0.5 rounded-full border border-gray-200 bg-white p-1 shadow-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full sm:size-8"
                  onClick={zoom.zoomOut}
                  disabled={!zoom.canZoomOut}
                  aria-label="کوچک‌نمایی"
                >
                  <FiMinus />
                </Button>

                <span
                  aria-live="polite"
                  className="min-w-10 text-center text-xs font-bold text-gray-600 tabular-nums"
                >
                  {e2p(zoom.zoomPercent)}٪
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full sm:size-8"
                  onClick={zoom.zoomIn}
                  disabled={!zoom.canZoomIn}
                  aria-label="بزرگ‌نمایی"
                >
                  <FiPlus />
                </Button>

                <span
                  className="mx-0.5 h-5 w-px bg-gray-200"
                  aria-hidden="true"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full sm:size-8"
                  onClick={zoom.reset}
                  disabled={!zoom.isZoomed}
                  aria-label="بازنشانی بزرگ‌نمایی"
                >
                  <LuRotateCcw />
                </Button>
              </div>

              <p className="hidden text-[11px] text-gray-400 lg:block">
                با دوبار کلیک یا چرخ ماوس بزرگ‌نمایی کنید و با کشیدن، همه‌جای
                تصویر را ببینید.
              </p>
            </div>
          </div>

          {/* ستون تصاویر کوچک؛ در موبایل نوار افقی زیر تصویر */}
          <div className="order-2 flex shrink-0 gap-2 overflow-x-auto pb-1 sm:order-1 sm:max-h-[62vh] sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto sm:pe-1 sm:pb-0">
            {images.map((item) => {
              const isActive = item.src === activeSrc;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.src)}
                  aria-label={`نمایش تصویر ${item.name || productName}`}
                  aria-pressed={isActive}
                  className={cn(
                    "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition duration-200 sm:h-20 sm:w-20",
                    "focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1 focus-visible:outline-none",
                    isActive
                      ? "border-orange-500 shadow-sm"
                      : "border-gray-200 hover:border-orange-300",
                  )}
                >
                  <Image
                    src={item.src}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain p-1.5"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
