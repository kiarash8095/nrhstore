"use client";

import { useEffect,useRef } from "react";

type Axis = "horizontal" | "vertical";

interface UseDragScrollOptions {
  axis?: Axis;
  speed?: number;
  threshold?: number;
}

export function useDragScroll({
  axis = "horizontal",
  speed = 1,
  threshold = 5,
}: UseDragScrollOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);

  const isPointerDown = useRef(false);
  const isDragging = useRef(false);
  const shouldPreventClick = useRef(false);

  const startPosition = useRef(0);
  const lastPosition = useRef(0);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const getPosition = (event: PointerEvent) => {
      return axis === "horizontal"
        ? event.clientX
        : event.clientY;
    };

    const handlePointerDown = (event: PointerEvent) => {
      // فقط کلیک چپ موس
      if (
        event.pointerType === "mouse" &&
        event.button !== 0
      ) {
        return;
      }

      isPointerDown.current = true;
      isDragging.current = false;
      shouldPreventClick.current = false;

      const position = getPosition(event);

      startPosition.current = position;
      lastPosition.current = position;

      element.classList.add("cursor-grab");
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isPointerDown.current) return;

      const currentPosition = getPosition(event);

      const totalDistance =
        currentPosition - startPosition.current;

      // هنوز Drag شروع نشده
      if (!isDragging.current) {
        if (Math.abs(totalDistance) < threshold) {
          return;
        }

        isDragging.current = true;
        shouldPreventClick.current = true;

        element.classList.remove("cursor-grab");
        element.classList.add("cursor-grabbing");
      }

      const delta =
        currentPosition - lastPosition.current;

      lastPosition.current = currentPosition;

      // جلوگیری از scroll خود صفحه در هنگام drag
      event.preventDefault();

      if (axis === "horizontal") {
        element.scrollLeft -= delta * speed;
      } else {
        element.scrollTop -= delta * speed;
      }
    };

    const handlePointerUp = () => {
      if (!isPointerDown.current) return;

      isPointerDown.current = false;

      element.classList.remove("cursor-grabbing");
      element.classList.add("cursor-grab");

      // مهم:
      // isDragging را اینجا reset نمی‌کنیم
      // چون click بعد از pointerup اتفاق می‌افتد.
    };

    const handleClick = (event: MouseEvent) => {
      if (shouldPreventClick.current) {
        event.preventDefault();
        event.stopPropagation();

        shouldPreventClick.current = false;
        isDragging.current = false;

        return;
      }

      isDragging.current = false;
    };

    element.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    window.addEventListener(
      "pointermove",
      handlePointerMove,
      { passive: false }
    );

    window.addEventListener(
      "pointerup",
      handlePointerUp
    );

    window.addEventListener(
      "pointercancel",
      handlePointerUp
    );

    element.addEventListener(
      "click",
      handleClick,
      true
    );

    return () => {
      element.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      window.removeEventListener(
        "pointerup",
        handlePointerUp
      );

      window.removeEventListener(
        "pointercancel",
        handlePointerUp
      );

      element.removeEventListener(
        "click",
        handleClick,
        true
      );
    };
  }, [axis, speed, threshold]);

  return ref;
}