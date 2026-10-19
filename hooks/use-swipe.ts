// hooks/useSwipe.ts
import { useRef,useState } from "react";

interface UseSwipeProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeComplete?: () => void;
  isRTL?: boolean;
  maxDrag?: number; // حداکثر درصد کشیدن (پیشفرض 30%)
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeComplete,
  isRTL = false,
  maxDrag = 30,
}: UseSwipeProps = {}) {
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const currentX = useRef(0);
  const containerWidth = useRef(0);
  const isSwiped = useRef(false);

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    startX.current = clientX;
    currentX.current = clientX;
    isSwiped.current = false;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;

    currentX.current = clientX;
    const diff = ((startX.current - clientX) / containerWidth.current) * 100;

    // محدود کردن میزان کشیدن
    const limitedDiff = Math.max(-maxDrag, Math.min(maxDrag, diff));
    setOffset(limitedDiff);
  };

  const handleEnd = () => {
    setIsDragging(false);

    // محاسبه درصد حرکت
    const diffPercent = Math.abs(offset);

    // اگر بیش از 10% کشیده شده باشه، اسلاید عوض کن
    if (diffPercent > 10) {
      if (isRTL) {
        if (offset > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      } else {
        if (offset > 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      }
    }

    onSwipeComplete?.();
    setOffset(0);
  };

  // رویدادهای لمسی
  const onTouchStart = (e: React.TouchEvent) => {
    containerWidth.current = e.currentTarget?.parentElement?.offsetWidth || 1;
    handleStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    handleMove(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    handleEnd();
  };

  // رویدادهای ماوس
  const onMouseDown = (e: React.MouseEvent) => {
    containerWidth.current = e.currentTarget?.parentElement?.offsetWidth || 1;
    handleStart(e.clientX);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const onMouseUp = () => {
    handleEnd();
  };

  return {
    isDragging,
    offset,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    // برای reset کردن بعد از تغییر اسلاید
    resetOffset: () => setOffset(0),
  };
}
