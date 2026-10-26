"use client";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  LogIn,
  MessageSquareText,
  Send,
  UserRound,
} from "lucide-react";
import { getAuthIdentity, useAuth, useAuthActions } from "@/features/auth";
import {
  blogCommentInputSchema,
  blogCommentResultSchema,
  blogCommentsPageSchema,
} from "../../contracts";
import { formatBlogDate } from "../../utils/blog";
import { e2p } from "@/utils/numbers";

async function loadComments(postId: number, page: number, signal: AbortSignal) {
  const response = await fetch(`/api/blog/${postId}/comments?page=${page}`, {
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) throw new Error("دریافت دیدگاه‌ها انجام نشد.");
  return blogCommentsPageSchema.parse(await response.json());
}

function CommentForm({
  postId,
  identity,
}: {
  postId: number;
  identity: string;
}) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const attempt = useRef<{ content: string; key: string } | null>(null);
  const sending = useRef(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || identity !== getAuthIdentity()) return;
    const parsed = blogCommentInputSchema.safeParse({ content });
    if (!parsed.success) {
      setNotice({ text: parsed.error.issues[0].message, error: true });
      return;
    }
    if (attempt.current?.content !== parsed.data.content)
      attempt.current = {
        content: parsed.data.content,
        key: crypto.randomUUID(),
      };
    sending.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/blog/${postId}/comments`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": attempt.current!.key,
        },
        body: JSON.stringify(parsed.data),
        signal: AbortSignal.timeout(45_000),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          typeof body?.error?.message === "string"
            ? body.error.message
            : "ثبت دیدگاه ممکن نشد.",
        );
      const result = blogCommentResultSchema.parse(body);
      if (identity !== getAuthIdentity()) return;
      setNotice({ text: result.message, error: false });
      setContent("");
      attempt.current = null;
      await queryClient.invalidateQueries({
        queryKey: ["blog-comments", postId],
      });
    } catch (error) {
      if (identity === getAuthIdentity())
        setNotice({
          text:
            error instanceof Error &&
            !["TimeoutError", "AbortError"].includes(error.name)
              ? error.message
              : "پاسخ ثبت دریافت نشد. پیش از ارسال دوباره، دیدگاه‌ها را بررسی کنید.",
          error: true,
        });
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="mt-6 border-t border-gray-100 pt-6"
    >
      <label htmlFor="blog-comment" className="text-sm font-bold text-gray-900">
        شما چه فکر می‌کنید؟
      </label>
      <p
        id="blog-comment-help"
        className="mt-2 text-xs leading-6 text-gray-500"
      >
        دیدگاه و تجربه‌تان را درباره این مقاله بنویسید. انتشار آن تابع بررسی و
        تنظیمات مدیر سایت است.
      </p>
      <textarea
        id="blog-comment"
        value={content}
        onChange={(event) => {
          setContent(event.target.value);
          setNotice(null);
        }}
        disabled={busy}
        minLength={3}
        maxLength={3000}
        required
        rows={5}
        aria-describedby="blog-comment-help"
        placeholder="نظر شما می‌تواند به خوانندگان دیگر کمک کند…"
        className="mt-4 w-full resize-y rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm leading-8 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:opacity-60"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] text-gray-400">
          {e2p(content.length)} از ۳۰۰۰ کلمه
        </span>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-xs font-bold text-white transition hover:bg-orange-600 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          {busy ? "در حال ثبت دیدگاه…" : "ثبت دیدگاه"}
        </button>
      </div>
      {notice && (
        <p
          role={notice.error ? "alert" : "status"}
          className={`mt-4 rounded-xl px-4 py-3 text-xs leading-7 ${notice.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
        >
          {notice.text}
        </p>
      )}
    </form>
  );
}

export function BlogComments({
  postId,
  commentsOpen,
  nextPath,
}: {
  postId: number;
  commentsOpen: boolean;
  nextPath: string;
}) {
  const [page, setPage] = useState(1);
  const { isAuthenticated, isRestoring, user } = useAuth();
  const { openAuth } = useAuthActions();
  const query = useQuery({
    queryKey: ["blog-comments", postId, page],
    queryFn: ({ signal }) => loadComments(postId, page, signal),
    staleTime: 30_000,
    retry: 1,
  });
  return (
    <section
      id="blog-comments"
      aria-labelledby="blog-comments-title"
      className="scroll-mt-28 rounded-3xl border border-gray-100 bg-white p-5 sm:p-8"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
          <MessageSquareText className="size-5" aria-hidden="true" />
        </span>
        <h2
          id="blog-comments-title"
          className="text-lg font-bold text-gray-900"
        >
          گفت‌وگو درباره مقاله
        </h2>
        {query.data && (
          <span className="ms-auto rounded-lg bg-gray-50 px-2.5 py-1 text-xs text-gray-500">
            {e2p(query.data.total)} دیدگاه
          </span>
        )}
      </div>
      {query.isPending ? (
        <p role="status" className="py-8 text-center text-xs text-gray-500">
          در حال دریافت دیدگاه‌ها…
        </p>
      ) : query.isError ? (
        <div
          role="alert"
          className="mt-5 rounded-xl bg-orange-50 p-4 text-xs leading-7 text-gray-600"
        >
          دریافت دیدگاه‌ها انجام نشد.
          <button
            onClick={() => void query.refetch()}
            className="ms-3 font-bold text-orange-600"
          >
            تلاش دوباره
          </button>
        </div>
      ) : (
        <>
          {query.data.items.length ? (
            <ol className="mt-6 space-y-4">
              {query.data.items.map((comment) => (
                <li
                  key={comment.id}
                  id={`comment-${comment.id}`}
                  className="rounded-2xl border border-gray-100 bg-gray-50/40 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                      <UserRound className="size-4" aria-hidden="true" />
                    </span>
                    <strong className="text-xs font-bold text-gray-800">
                      {comment.author || "خواننده مجله"}
                    </strong>
                    <time
                      dateTime={comment.publishedAt}
                      className="text-[10px] text-gray-400 sm:ms-auto"
                    >
                      {formatBlogDate(comment.publishedAt)}
                    </time>
                  </div>
                  {comment.parent > 0 && (
                    <p className="mt-3 text-[10px] text-orange-600">
                      در پاسخ به دیدگاه {e2p(comment.parent)}
                    </p>
                  )}
                  <p className="mt-3 whitespace-pre-line break-words text-sm leading-8 text-gray-600">
                    {comment.content}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <div className="my-6 rounded-2xl bg-gray-50/80 px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-700">
                هنوز دیدگاهی منتشر نشده است
              </p>
              <p className="mt-2 text-xs leading-6 text-gray-500">
                {commentsOpen
                  ? "شما می‌توانید آغازکننده این گفت‌وگو باشید."
                  : "با مقاله‌های دیگر مجله همراه باشید."}
              </p>
            </div>
          )}
          {query.data.totalPages > 1 && (
            <nav
              aria-label="صفحه‌بندی دیدگاه‌ها"
              className="mt-5 flex items-center justify-center gap-4 text-xs"
            >
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                aria-label="دیدگاه‌های قبلی"
                className="rounded-lg border p-2 disabled:opacity-30"
              >
                <ArrowRight className="size-4" />
              </button>
              <span>
                {e2p(page)} از {e2p(query.data.totalPages)}
              </span>
              <button
                disabled={page >= query.data.totalPages}
                onClick={() => setPage(page + 1)}
                aria-label="دیدگاه‌های بعدی"
                className="rounded-lg border p-2 disabled:opacity-30"
              >
                <ArrowLeft className="size-4" />
              </button>
            </nav>
          )}
        </>
      )}
      {!commentsOpen ? (
        <p className="mt-6 border-t border-gray-100 pt-5 text-xs leading-7 text-gray-500">
          ثبت دیدگاه جدید برای این مقاله بسته شده است.
        </p>
      ) : isAuthenticated && user ? (
        <CommentForm key={user.id} identity={user.id} postId={postId} />
      ) : (
        <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl border border-orange-100 bg-orange-50/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-7 text-gray-600">
            برای شرکت در گفت‌وگو، وارد حساب کاربری خود شوید.
          </p>
          <button
            type="button"
            disabled={isRestoring}
            onClick={() => openAuth({ nextPath })}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-xs font-bold text-white disabled:opacity-50"
          >
            <LogIn className="size-4" aria-hidden="true" />
            {isRestoring ? "بررسی حساب…" : "ورود و ثبت دیدگاه"}
          </button>
        </div>
      )}
    </section>
  );
}
