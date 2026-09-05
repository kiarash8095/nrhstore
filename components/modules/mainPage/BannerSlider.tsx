"use client";

import { useSwipe } from "@/hooks/useSwipe";
import React, { useEffect, useState, useRef } from "react";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";

export interface Slider {
  name: string;
  cover: string;
}

export const sliders: Slider[] = [
  { name: "بنر ۱", cover: "/Untitled-1-2.webp" },
  { name: "بنر ۲", cover: "/Untitled-11.webp" },
  { name: "بنر ۳", cover: "/slider1-5.webp" },
  { name: "بنر ۴", cover: "/slider4.webp" },
];

export function BannerSlider({ autoplay = true, interval = 5000 }) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number>(0);
  const [touchEndX, setTouchEndX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Autoplay
  useEffect(() => {
    if (!autoplay || isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev === sliders.length - 1 ? 0 : prev + 1));
    }, interval);
    return () => clearInterval(timer);
  }, [autoplay, interval, isHovered]);

  // رفتن به اسلاید بعدی
  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === sliders.length - 1 ? 0 : prev + 1));
  };

  // رفتن به اسلاید قبلی
  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? sliders.length - 1 : prev - 1));
  };

  const swipe = useSwipe({
    onSwipeLeft: prevSlide,
    onSwipeRight: nextSlide,
    isRTL: false,
    maxDrag: 25,
  });

  // محاسبه transform
  const getTransform = () => {
    const baseTransform = currentIndex * 100;
    let offset = 0;

    if (isDragging) {
      offset = dragOffset;
    }

    return `translateX(${baseTransform + offset}%)`;
  };

  return (
    <div
      className="relative w-full max-w-6xl mx-auto my-5"
      dir="rtl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* کانتینر اصلی اسلایدر */}
      <div className="relative mx-auto aspect-[16/7] w-[95%] overflow-hidden rounded-2xl bg-gray-100 shadow-2xl sm:w-full">
        {/* اسلایدها */}
        <div
          ref={sliderRef}
          className="flex h-full select-none"
          style={{
            transform: getTransform(),
            transition: isDragging
              ? "none"
              : "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
            width: `${sliders.length * 100}%`,
            cursor: isDragging ? "grabbing" : "grab",
          }}
          onTouchStart={swipe.onTouchStart}
          onTouchMove={swipe.onTouchEnd}
          onTouchEnd={swipe.onTouchEnd}
          onMouseDown={swipe.onMouseDown}
          onMouseMove={swipe.onMouseMove}
          onMouseUp={swipe.onMouseUp}
          onMouseLeave={swipe.onMouseUp}
        >
          {sliders.map((slider: Slider, index: number) => (
            <div
              key={slider.name}
              className="h-full relative flex-shrink-0"
              style={{
                flex: "0 0 100%",
                minWidth: "100%",
                backgroundColor: "#f3f4f6",
              }}
            >
              <img
                src={slider.cover}
                alt={slider.name}
                className="h-full w-full object-cover pointer-events-none"
                loading="eager"
                draggable={false}
              />

              {/* متن روی اسلاید */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-6 pointer-events-none">
                <h3 className="text-white text-xl md:text-2xl font-bold text-right drop-shadow-lg">
                  {slider.name}
                </h3>
              </div>

              {/* شمارنده اسلاید */}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full pointer-events-none">
                {index + 1} / {sliders.length}
              </div>
            </div>
          ))}
        </div>

        {/* دکمه قبلی - سمت راست */}
        <button
          onClick={prevSlide}
          className={`
                        absolute top-1/2 right-4 -translate-y-1/2 
                        bg-black/60 hover:bg-black/80 
                        text-white w-12 h-12 rounded-full 
                        transition-all duration-300 
                        hover:scale-110 hover:shadow-xl
                        backdrop-blur-sm
                        border border-white/20
                        focus:outline-none focus:ring-4 focus:ring-white/50
                        z-10
                        flex items-center justify-center
                        ${isHovered ? "opacity-100" : "opacity-70 md:opacity-0"}
                        md:group-hover:opacity-100
                    `}
          aria-label="اسلاید قبلی"
        >
          <IoIosArrowForward className="text-2xl" />
        </button>

        {/* دکمه بعدی - سمت چپ */}
        <button
          onClick={nextSlide}
          className={`
                        absolute top-1/2 left-4 -translate-y-1/2 
                        bg-black/60 hover:bg-black/80 
                        text-white w-12 h-12 rounded-full 
                        transition-all duration-300 
                        hover:scale-110 hover:shadow-xl
                        backdrop-blur-sm
                        border border-white/20
                        focus:outline-none focus:ring-4 focus:ring-white/50
                        z-10
                        flex items-center justify-center
                        ${isHovered ? "opacity-100" : "opacity-70 md:opacity-0"}
                        md:group-hover:opacity-100
                    `}
          aria-label="اسلاید بعدی"
        >
          <IoIosArrowBack className="text-2xl" />
        </button>

        {/* دکمه‌های کوچک موبایل (همیشه نمایش) */}
        <button
          onClick={prevSlide}
          className="md:hidden absolute top-1/2 right-2 -translate-y-1/2 
                             bg-black/50 text-white p-2 rounded-full 
                             backdrop-blur-sm z-10"
        >
          <IoIosArrowForward className="text-xl" />
        </button>
        <button
          onClick={nextSlide}
          className="md:hidden absolute top-1/2 left-2 -translate-y-1/2 
                             bg-black/50 text-white p-2 rounded-full 
                             backdrop-blur-sm z-10"
        >
          <IoIosArrowBack className="text-xl" />
        </button>
      </div>

      {/* دایره‌های ناوبری */}
      <div className="flex justify-center items-center gap-3 mt-6">
        {sliders.map((slider: Slider, index: number) => (
          <button
            key={slider.name}
            onClick={() => setCurrentIndex(index)}
            className={`
                            rounded-full transition-all duration-300 
                            focus:outline-none focus:ring-2 focus:ring-blue-400/50
                            ${
                              currentIndex === index
                                ? "w-8 h-3 bg-blue-600 scale-100"
                                : "w-3 h-3 bg-gray-300 hover:bg-gray-400 scale-100"
                            }
                        `}
            aria-label={`رفتن به اسلاید ${index + 1}`}
          />
        ))}
      </div>

      {/* نمایش اسلاید فعلی (موبایل) */}
      <div className="text-center mt-2 text-sm text-gray-400 md:hidden">
        {currentIndex + 1} از {sliders.length}
      </div>
    </div>
  );
}
