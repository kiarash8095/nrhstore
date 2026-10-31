"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  CircleAlert,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CommentForm } from "../forms/CommentForm";
import type {
  ProductComment,
  ProductCommentsPage,
} from "../schemas/comments.types";
import { CommentsStarsRating } from "./CommentsStarsRating";
import { CommentsFilters } from "./CommentsFilters";

interface CommentsSectionProps {
  productId: number;
  averageRating?: string | number;
  reviewCount?: number;
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}

function CommentCard({ comment }: { comment: ProductComment }) {
  return (
    <article
      className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
      dir="rtl"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-orange-100 text-sm font-bold text-orange-700">
            {comment.reviewer.slice(0, 1)}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">
              {comment.reviewer}
            </p>
            {formatDate(comment.date) && (
              <p className="mt-1 text-[11px] text-gray-400">
                {formatDate(comment.date)}
              </p>
            )}
          </div>
        </div>
        {comment.rating > 0 && (
          <CommentsStarsRating value={comment.rating} size="sm" />
        )}
      </div>
      <p className="mt-4 whitespace-pre-line text-sm leading-8 text-gray-700">
        {comment.review}
      </p>
      {(comment.pros.length > 0 || comment.cons.length > 0) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {comment.pros.length > 0 && (
            <div className="rounded-2xl bg-emerald-50/70 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <ThumbsUp className="size-4" /> نقاط قوت
              </p>
              <div className="flex flex-wrap gap-1.5">
                {comment.pros.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] text-emerald-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {comment.cons.length > 0 && (
            <div className="rounded-2xl bg-red-50/70 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-red-700">
                <ThumbsDown className="size-4" /> نقاط ضعف
              </p>
              <div className="flex flex-wrap gap-1.5">
                {comment.cons.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-red-100 px-2 py-1 text-[11px] text-red-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function CommentSkeleton() {
  return (
    <div className="h-44 animate-pulse rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="h-5 w-32 rounded bg-gray-100" />
      <div className="mt-5 h-4 w-full rounded bg-gray-100" />
      <div className="mt-3 h-4 w-4/5 rounded bg-gray-100" />
      <div className="mt-6 h-7 w-40 rounded-full bg-gray-100" />
    </div>
  );
}

export function CommentsSection({
  productId,
  averageRating = 0,
  reviewCount = 0,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<ProductComment[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const commentsRequestIdRef = useRef(0);
  const commentsAbortRef = useRef<AbortController | null>(null);

  const loadComments = useCallback(
    async (nextPage: number, append: boolean) => {
      const requestId = ++commentsRequestIdRef.current;
      commentsAbortRef.current?.abort();
      const controller = new AbortController();
      commentsAbortRef.current = controller;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/product-comments/${productId}?page=${nextPage}`,
          {
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          },
        );
        const body = (await response.json().catch(() => null)) as
          | (Partial<ProductCommentsPage> & { message?: string })
          | null;
        if (!response.ok || !Array.isArray(body?.comments))
          throw new Error(body?.message || "دریافت دیدگاه‌ها ممکن نشد.");
        if (
          controller.signal.aborted ||
          requestId !== commentsRequestIdRef.current
        )
          return;
        setComments((current) =>
          append
            ? [...current, ...(body.comments as ProductComment[])]
            : (body.comments as ProductComment[]),
        );
        setPage(nextPage);
        setHasMore(Boolean(body.hasMore));
      } catch (caught) {
        if (
          controller.signal.aborted ||
          requestId !== commentsRequestIdRef.current
        )
          return;
        setError(
          caught instanceof Error
            ? caught.message
            : "دریافت دیدگاه‌ها ممکن نشد.",
        );
      } finally {
        if (requestId === commentsRequestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
          if (commentsAbortRef.current === controller)
            commentsAbortRef.current = null;
        }
      }
    },
    [productId],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadComments(1, false);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      commentsAbortRef.current?.abort();
    };
  }, [loadComments]);

  const average = Number(averageRating);
  const visibleAverage = Number.isFinite(average) && average > 0 ? average : 0;
  const refreshAfterSubmit = () => {
    void loadComments(1, false);
  };

  return (
    <section
      className="w-full space-y-6"
      aria-labelledby="product-comments-title"
    >
      <div
        className="border-b border-gray-100 pb-5"
        dir="rtl"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h2
                id="product-comments-title"
                className="text-base font-bold text-gray-900"
              >
                دیدگاه کاربران
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                تجربهٔ واقعی خریداران را بخوانید و تجربهٔ خودتان را بنویسید.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm sm:justify-end">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">
                {visibleAverage > 0
                  ? visibleAverage.toLocaleString("fa-IR", {
                      maximumFractionDigits: 1,
                    })
                  : "—"}
              </p>
              <p className="text-[10px] text-gray-500">میانگین امتیاز</p>
            </div>
            <CommentsStarsRating value={Math.round(visibleAverage)} size="sm" />
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">
                {Number(reviewCount).toLocaleString("fa-IR")}
              </p>
              <p className="text-[10px] text-gray-500">دیدگاه</p>
            </div>
          </div>
        </div>
      </div>

      <details className="group rounded-xl border border-gray-200 bg-white px-4">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-semibold text-gray-800 focus-visible:outline-2 focus-visible:outline-orange-500 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2"><MessageCircle className="size-4 text-orange-600" aria-hidden="true" />دیدگاه خود را بنویسید</span>
          <ChevronDown className="size-4 text-gray-400 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
        </summary>
        <div className="border-t border-gray-100 py-4">
          <CommentForm productId={productId} onSubmitted={refreshAfterSubmit} />
        </div>
      </details>

      {!loading && !error && comments.length > 0 && (
        <CommentsFilters count={comments.length} />
      )}
      <div
        className="border-t border-gray-100 pt-5"
        dir="rtl"
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-200 px-1 pb-3">
          <h3 className="text-sm font-bold text-gray-800">
            دیدگاه‌های ثبت‌شده
          </h3>
          {!loading && !error && comments.length > 0 && (
            <span className="text-xs text-gray-500">
              {comments.length.toLocaleString("fa-IR")} دیدگاه
            </span>
          )}
        </div>
        <div className="space-y-3">
          {loading && (
            <>
              <CommentSkeleton />
              <CommentSkeleton />
            </>
          )}
          {!loading && error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800"
              dir="rtl"
            >
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-1 size-5 shrink-0" />
                <div>
                  <p className="text-sm font-bold">دیدگاه‌ها بارگذاری نشدند.</p>
                  <p className="mt-1 text-xs leading-6">{error}</p>
                  <button
                    type="button"
                    onClick={() => void loadComments(1, false)}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-red-700 shadow-sm hover:bg-red-100"
                  >
                    <RefreshCw className="size-3.5" /> تلاش دوباره
                  </button>
                </div>
              </div>
            </div>
          )}
          {!loading && !error && comments.length === 0 && (
            <div
              className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center"
              dir="rtl"
            >
              <MessageCircle className="mx-auto size-8 text-gray-300" />
              <p className="mt-3 text-sm font-bold text-gray-700">
                هنوز دیدگاهی برای این محصول ثبت نشده است.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                اولین نفری باشید که تجربه‌اش را با دیگران به اشتراک می‌گذارد.
              </p>
            </div>
          )}
          {!loading &&
            !error &&
            comments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} />
            ))}
        </div>
      </div>

      {!loading && !error && hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadComments(page + 1, true)}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600 disabled:cursor-wait disabled:opacity-60",
            )}
          >
            {loadingMore ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ChevronDown className="size-4" />
            )}
            {loadingMore ? "در حال بارگذاری..." : "مشاهده دیدگاه‌های بیشتر"}
          </button>
        </div>
      )}
      {!loading && !error && comments.length > 0 && !hasMore && (
        <p className="text-center text-xs text-gray-400">
          همهٔ دیدگاه‌های تأییدشده نمایش داده شد.
        </p>
      )}
    </section>
  );
}
