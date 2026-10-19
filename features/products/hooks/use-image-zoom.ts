"use client";

import {
useCallback,
useEffect,
useRef,
useState,
type CSSProperties,
type KeyboardEvent as ReactKeyboardEvent,
type MouseEvent as ReactMouseEvent,
type PointerEvent as ReactPointerEvent,
type RefObject,
type SyntheticEvent,
} from "react";

interface Point {
  x: number;
  y: number;
}

interface UseImageZoomOptions {
  /** قاب تصویر در اختیار کامپوننت است و به هوک داده می‌شود */
  containerRef: RefObject<HTMLDivElement | null>;
  /** همان نود قاب به‌صورت مقدار؛ با سوار/پیاده شدن مودال عوض می‌شود */
  containerNode?: HTMLDivElement | null;
  minScale?: number;
  maxScale?: number;
  /** گام بزرگ/کوچک کردن با دکمه‌ها و چرخ ماوس */
  step?: number;
}

const ZERO: Point = { x: 0, y: 0 };
const PAN_KEY_STEP = 48;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * بزرگ‌نمایی و جابه‌جایی تصویر داخل یک قاب.
 * - بزرگ‌نمایی حول نقطه‌ی نشانگر (چرخ ماوس، دوبار کلیک، دکمه‌ها و پینچ دو انگشت)
 * - جابه‌جایی با کشیدن، پینچ یا کلیدهای جهت‌دار، همیشه محدود به مرزهای تصویر
 */
export function useImageZoom({
  containerRef,
  containerNode = null,
  minScale = 1,
  maxScale = 4,
  step = 0.5,
}: UseImageZoomOptions) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageSizeRef = useRef<Point | null>(null);
  const scaleRef = useRef(minScale);
  const offsetRef = useRef<Point>(ZERO);
  const panningRef = useRef(false);
  const dragRef = useRef({ pointerX: 0, pointerY: 0, offsetX: 0, offsetY: 0 });
  const pointersRef = useRef(new Map<number, Point>());
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

  const [scale, setScale] = useState(minScale);
  const [offset, setOffset] = useState<Point>(ZERO);
  const [isPanning, setIsPanning] = useState(false);

  /**
   * اندازه‌ی واقعی تصویر؛ اگر رویداد load از دست رفته باشد (تصویر از کش مرورگر
   * پیش از اتصال هندلر آماده شده باشد) اندازه از خود المان داخل قاب خوانده می‌شود.
   */
  const readImageSize = useCallback((): Point | null => {
    const image =
      imageRef.current ?? containerRef.current?.querySelector("img") ?? null;

    if (!image?.naturalWidth || !image?.naturalHeight) {
      return imageSizeRef.current;
    }

    const size = { x: image.naturalWidth, y: image.naturalHeight };
    imageSizeRef.current = size;
    return size;
  }, [containerRef]);

  /** حداکثر جابه‌جایی مجاز؛ تصویر نباید از قاب بیرون بزند */
  const getPanLimit = useCallback(
    (currentScale: number): Point => {
      const container = containerRef.current;
      const size = readImageSize();

      if (!container || !size?.x || !size?.y) return ZERO;

      const { width, height } = container.getBoundingClientRect();
      const fitRatio = Math.min(width / size.x, height / size.y);
      const shownWidth = size.x * fitRatio;
      const shownHeight = size.y * fitRatio;

      return {
        x: Math.max(0, (shownWidth * currentScale - width) / 2),
        y: Math.max(0, (shownHeight * currentScale - height) / 2),
      };
    },
    [readImageSize, containerRef],
  );

  const clampOffset = useCallback(
    (next: Point, currentScale: number): Point => {
      const limit = getPanLimit(currentScale);
      return {
        x: clamp(next.x, -limit.x, limit.x),
        y: clamp(next.y, -limit.y, limit.y),
      };
    },
    [getPanLimit],
  );

  const commit = useCallback((nextScale: number, nextOffset: Point) => {
    scaleRef.current = nextScale;
    offsetRef.current = nextOffset;
    setScale(nextScale);
    setOffset(nextOffset);
  }, []);

  /** مختصات نقطه‌ی داده‌شده نسبت به مرکز قاب */
  const originFrom = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return undefined;

    const rect = container.getBoundingClientRect();
    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
  }, [containerRef]);

  /** بزرگ‌نمایی حول یک نقطه تا آن نقطه زیر نشانگر ثابت بماند */
  const zoomTo = useCallback(
    (nextScale: number, origin?: Point) => {
      const current = scaleRef.current;
      const target = clamp(nextScale, minScale, maxScale);

      if (Math.abs(target - current) < 0.001) return;

      const factor = target / current;
      const base = offsetRef.current;
      const next = origin
        ? {
            x: origin.x - (origin.x - base.x) * factor,
            y: origin.y - (origin.y - base.y) * factor,
          }
        : { x: base.x * factor, y: base.y * factor };

      commit(target, clampOffset(next, target));
    },
    [clampOffset, commit, maxScale, minScale],
  );

  const zoomIn = useCallback(() => zoomTo(scaleRef.current + step), [step, zoomTo]);
  const zoomOut = useCallback(() => zoomTo(scaleRef.current - step), [step, zoomTo]);
  const reset = useCallback(() => {
    panningRef.current = false;
    setIsPanning(false);
    commit(minScale, ZERO);
  }, [commit, minScale]);

  const toggleZoom = useCallback(
    (origin?: Point) => {
      if (scaleRef.current > minScale) reset();
      else zoomTo(Math.min(maxScale, 2), origin);
    },
    [maxScale, minScale, reset, zoomTo],
  );

  /** اندازه‌ی واقعی تصویر را ثبت می‌کند تا مرزهای جابه‌جایی دقیق باشد */
  const handleImageLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      const image = event.currentTarget;
      imageRef.current = image;
      imageSizeRef.current = { x: image.naturalWidth, y: image.naturalHeight };

      const clamped = clampOffset(offsetRef.current, scaleRef.current);
      if (clamped.x !== offsetRef.current.x || clamped.y !== offsetRef.current.y) {
        offsetRef.current = clamped;
        setOffset(clamped);
      }
    },
    [clampOffset],
  );

  const panBy = useCallback(
    (delta: Point) => {
      const base = offsetRef.current;
      const next = clampOffset(
        { x: base.x + delta.x, y: base.y + delta.y },
        scaleRef.current,
      );
      offsetRef.current = next;
      setOffset(next);
    },
    [clampOffset],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    // دو انگشت: شروع بزرگ‌نمایی با پینچ
    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()];
      pinchRef.current = {
        distance: Math.hypot(first.x - second.x, first.y - second.y),
        scale: scaleRef.current,
      };
      panningRef.current = false;
      setIsPanning(false);
      return;
    }

    if (scaleRef.current <= minScale) return;

    // اگر مرورگر از pointer capture پشتیبانی نکند، جابه‌جایی با رویدادهای عادی ادامه می‌یابد
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // نادیده گرفتن؛ کشیدن تصویر در هر حال کار می‌کند
    }

    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: offsetRef.current.x,
      offsetY: offsetRef.current.y,
    };
    panningRef.current = true;
    setIsPanning(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;

    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [first, second] = [...pointersRef.current.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      const ratio =
        pinchRef.current.distance > 0 ? distance / pinchRef.current.distance : 1;

      zoomTo(
        pinchRef.current.scale * ratio,
        originFrom((first.x + second.x) / 2, (first.y + second.y) / 2),
      );
      return;
    }

    if (!panningRef.current) return;

    const next = clampOffset(
      {
        x: dragRef.current.offsetX + (event.clientX - dragRef.current.pointerX),
        y: dragRef.current.offsetY + (event.clientY - dragRef.current.pointerY),
      },
      scaleRef.current,
    );

    offsetRef.current = next;
    setOffset(next);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);

    if (pointersRef.current.size < 2) pinchRef.current = null;

    if (pointersRef.current.size === 0) {
      panningRef.current = false;
      setIsPanning(false);
    }
  };

  const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    toggleZoom(originFrom(event.clientX, event.clientY));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "+":
      case "=":
        zoomIn();
        break;
      case "-":
      case "_":
        zoomOut();
        break;
      case "0":
        reset();
        break;
      case "ArrowUp":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight": {
        if (scaleRef.current <= minScale) return;

        event.preventDefault();
        panBy({
          x: event.key === "ArrowRight" ? PAN_KEY_STEP : event.key === "ArrowLeft" ? -PAN_KEY_STEP : 0,
          y: event.key === "ArrowDown" ? PAN_KEY_STEP : event.key === "ArrowUp" ? -PAN_KEY_STEP : 0,
        });
        break;
      }
      default:
        break;
    }
  };

  // چرخ ماوس باید با preventDefault همراه باشد، پس به‌صورت غیر passive ثبت می‌شود
  useEffect(() => {
    if (!containerNode) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomTo(
        scaleRef.current - Math.sign(event.deltaY) * step,
        originFrom(event.clientX, event.clientY),
      );
    };

    containerNode.addEventListener("wheel", handleWheel, { passive: false });
    return () => containerNode.removeEventListener("wheel", handleWheel);
  }, [containerNode, originFrom, step, zoomTo]);

  const imageStyle: CSSProperties = {
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
  };

  return {
    handleImageLoad,
    containerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
      onDoubleClick: handleDoubleClick,
      onKeyDown: handleKeyDown,
    },
    imageStyle,
    isPanning,
    isZoomed: scale > minScale,
    canZoomIn: scale < maxScale - 0.001,
    canZoomOut: scale > minScale + 0.001,
    zoomPercent: Math.round(scale * 100),
    zoomIn,
    zoomOut,
    reset,
    toggleZoom,
  };
}
