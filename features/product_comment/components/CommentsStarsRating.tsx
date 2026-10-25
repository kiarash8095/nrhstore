"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { e2p } from "@/utils/numbers";

interface CommentsStarsRatingProps {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function CommentsStarsRating({ value, onChange, disabled = false, size = "md", label = "امتیاز محصول" }: CommentsStarsRatingProps) {
  const editable = Boolean(onChange);
  const sizeClass = size === "sm" ? "size-4" : size === "lg" ? "size-7" : "size-6";

  return (
    <div className="flex items-center gap-2" dir="ltr">
      <div role={editable ? "radiogroup" : undefined} aria-label={label} className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, index) => {
          const rating = index + 1;
          const filled = rating <= value;
          const content = (
            <Star
              aria-hidden="true"
              className={cn(
                sizeClass,
                "transition-transform duration-150",
                filled ? "fill-orange-400 text-orange-400" : "text-gray-300",
                editable && "group-hover:scale-110",
              )}
            />
          );
          if (!editable) return <span key={rating}>{content}</span>;
          return (
            <button
              key={rating}
              type="button"
              role="radio"
              aria-label={`${rating} از ۵`}
              aria-checked={value === rating}
              disabled={disabled}
              onClick={() => onChange?.(rating)}

              className="group rounded-lg p-1 outline-none transition
               hover:bg-orange-50 focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {content}
            </button>
          );
        })}
      </div>
      {value > 0 && <span className="text-xs font-medium text-gray-500" dir="rtl">{e2p(value)} از ۵</span>}
    </div>
  );
}
