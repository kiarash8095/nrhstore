"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  CheckCircle2,
  CircleAlert,
  ListChecks,
  MessageSquareText,
  Plus,
  Star,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth, useAuthActions } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {e2p} from "@/utils/numbers";
import { CommentsStarsRating } from "../components/CommentsStarsRating";
import {
  commentTagSchema,
  productReviewInputSchema,
  reviewFieldLabels,
} from "../schemas/comments.types";

interface CommentFormProps {
  productId: number;
  onSubmitted: () => void;
}

type TagKind = "pros" | "cons";

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1 text-[11px] leading-5 text-red-600">{message}</p>
  ) : null;
}

function FormSectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 border-b border-gray-200 pb-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm ring-1 ring-gray-200">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div>
        <h4 className="text-xs font-bold text-gray-800 sm:text-sm">{title}</h4>
        <p className="hidden text-[10px] leading-4 text-gray-500 sm:block">
          {description}
        </p>
      </div>
    </div>
  );
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID();
  return `review-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function validationMessage(issue: { path: PropertyKey[]; message: string }) {
  const field = String(issue.path[0] || "");
  const message = issue.message.trim();
  const looksLikeZodDefault =
    /^(Invalid|Expected|Too small|Too big|Unrecognized|Invalid input)/i.test(
      message,
    );
  if (!looksLikeZodDefault && message) return message;
  const label = reviewFieldLabels[field] || "اطلاعات واردشده";
  return `${label} معتبر نیست.`;
}

function TagEditor({
  kind,
  tags,
  value,
  onValueChange,
  onAdd,
  onRemove,
  error,
  disabled = false,
}: {
  kind: TagKind;
  tags: string[];
  value: string;
  onValueChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (tag: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const isPros = kind === "pros";
  const label = isPros ? "نقاط قوت" : "نقاط ضعف";
  const hint = isPros ? "مثلاً: کیفیت ساخت" : "مثلاً: وزن زیاد";
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      onAdd();
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-3 sm:p-4",
        isPros
          ? "border-emerald-100 bg-emerald-50/60"
          : "border-red-100 bg-red-50/60",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p
            className={cn(
              "text-xs font-bold",
              isPros ? "text-emerald-700" : "text-red-700",
            )}
          >
            {label}
          </p>
          <p className="mt-0.5 text-[10px] text-gray-500">
            کلمه یا عبارت کوتاه اضافه کنید
          </p>
        </div>
        {isPros ? (
          <CheckCircle2 className="size-4 text-emerald-600" />
        ) : (
          <CircleAlert className="size-4 text-red-500" />
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={hint}
          aria-label={label}
          disabled={disabled}
          className="h-10 border border-gray-200 bg-white text-sm shadow-sm focus-visible:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-100"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onAdd}
          disabled={disabled}
          aria-label={`افزودن ${label}`}
          className="size-10 shrink-0 border border-gray-200 bg-white shadow-sm hover:border-orange-300"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="mt-2 flex min-h-6 flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
              isPros
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-800",
            )}
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemove(tag)}
              disabled={disabled}
              aria-label={`حذف ${tag}`}
              className="rounded-full p-0.5 hover:bg-black/10 disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <FieldError message={error} />
    </div>
  );
}

export function CommentForm({ productId, onSubmitted }: CommentFormProps) {
  const { isAuthenticated, isRestoring } = useAuth();
  const { openAuth } = useAuthActions();
  const [reviewer, setReviewer] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(0);
  const [pros, setPros] = useState<string[]>([]);
  const [cons, setCons] = useState<string[]>([]);
  const [prosDraft, setProsDraft] = useState("");
  const [consDraft, setConsDraft] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const pendingSubmissionRef = useRef<{
    fingerprint: string;
    key: string;
  } | null>(null);

  const addTag = (kind: TagKind) => {
    const draft = (kind === "pros" ? prosDraft : consDraft).trim();
    if (!draft) return;
    const parsed = commentTagSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors((current) => ({
        ...current,
        [kind]: parsed.error.issues[0]?.message || "برچسب معتبر نیست.",
      }));
      return;
    }
    const setter = kind === "pros" ? setPros : setCons;
    const current = kind === "pros" ? pros : cons;
    if (!current.includes(parsed.data)) setter([...current, parsed.data]);
    setErrors((current) => ({ ...current, [kind]: "" }));
    if (kind === "pros") setProsDraft("");
    else setConsDraft("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated) {
      if (!isRestoring) openAuth();
      return;
    }
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setNotice(null);
    const parsed = productReviewInputSchema.safeParse({
      product_id: productId,
      review,
      reviewer,
      reviewer_email: reviewerEmail,
      rating,
      pros,
      cons,
      criteria: {},
    });
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] || "form");
        nextErrors[field] ||= validationMessage(issue);
      }
      setErrors(nextErrors);
      setNotice({
        kind: "error",
        message: "لطفاً موارد مشخص‌شده را اصلاح کنید.",
      });
      submitLockRef.current = false;
      return;
    }

    const fingerprint = JSON.stringify(parsed.data);
    const previousSubmission = pendingSubmissionRef.current;
    const idempotencyKey =
      previousSubmission?.fingerprint === fingerprint
        ? previousSubmission.key
        : createIdempotencyKey();
    pendingSubmissionRef.current = { fingerprint, key: idempotencyKey };
    setErrors({});
    setSubmitting(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("/api/product-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(parsed.data),
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as {
        message?: string;
        error?: {
          code?: string;
          message?: string;
          fields?: Record<string, string>;
        };
      } | null;
      if (response.status === 401 && body?.error?.code === "login_required") {
        openAuth();
        setNotice({
          kind: "error",
          message:
            "نشست شما منقضی شده است؛ برای ارسال دیدگاه دوباره وارد شوید.",
        });
        return;
      }
      if (!response.ok) {
        if (body?.error?.fields) setErrors(body.error.fields);
        throw new Error(
          body?.error?.message || body?.message || "ثبت دیدگاه ممکن نشد.",
        );
      }
      setReviewer("");
      setReviewerEmail("");
      setReview("");
      setRating(0);
      setPros([]);
      setCons([]);
      pendingSubmissionRef.current = null;
      setNotice({
        kind: "success",
        message:
          body?.message ||
          "دیدگاه شما ثبت شد و پس از تأیید مدیر نمایش داده می‌شود.",
      });
      onSubmitted();
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "زمان ارسال درخواست تمام شد. برای تلاش دوباره دوباره ثبت دیدگاه را بزنید."
          : error instanceof Error
            ? error.message
            : "ثبت دیدگاه ممکن نشد.";
      setNotice({ kind: "error", message });
    } finally {
      window.clearTimeout(timeoutId);
      setSubmitting(false);
      submitLockRef.current = false;
    }
  };

  return (
    <form
      onSubmit={submit}
      aria-busy={submitting}
      noValidate
      className="bg-white"
      dir="rtl"
    >
      <div className="mb-5 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 sm:text-base">
            تجربه‌تان از این محصول چیست؟
          </h3>
          <p className="mt-0.5 text-[11px] leading-5 text-gray-500">
            دیدگاه شما پس از بررسی مدیر در صفحهٔ محصول منتشر می‌شود.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.65fr)_minmax(0,1.35fr)]">
      <fieldset className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5">
        <legend className="sr-only">امتیازدهی</legend>
        <FormSectionHeading
          icon={Star}
          title="امتیازدهی به محصول"
          description="تجربهٔ خودتان را با انتخاب یک تا پنج ستاره ثبت کنید."
        />
        <div className="flex min-h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
          <CommentsStarsRating
            value={rating}
            onChange={setRating}
            disabled={submitting}
          />
        </div>
        <FieldError message={errors.rating} />
      </fieldset>

      <fieldset className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <legend className="sr-only">اطلاعات کاربر</legend>
        <FormSectionHeading
          icon={UserRound}
          title="اطلاعات شما"
          description="نام و ایمیل برای نمایش و پیگیری دیدگاه استفاده می‌شود."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            <span className="text-xs font-bold text-gray-700">نام شما</span>
            <Input
              value={reviewer}
              onChange={(event) => setReviewer(event.target.value)}
              disabled={submitting}
              placeholder="مثلاً: علی رضایی"
              aria-invalid={Boolean(errors.reviewer)}
              className="mt-1.5 border border-gray-200 bg-white text-sm shadow-sm focus-visible:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-100"
            />
            <FieldError message={errors.reviewer} />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="text-xs font-bold text-gray-700">ایمیل شما</span>
            <Input
              type="email"
              inputMode="email"
              value={reviewerEmail}
              onChange={(event) => setReviewerEmail(event.target.value)}
              disabled={submitting}
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.reviewer_email)}
              className="mt-1.5 border border-gray-200 bg-white text-sm shadow-sm focus-visible:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-100"
            />
            <FieldError message={errors.reviewer_email} />
          </label>
        </div>
      </fieldset>
      </div>

      <fieldset className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <legend className="sr-only">متن دیدگاه</legend>
        <FormSectionHeading
          icon={MessageSquareText}
          title="متن دیدگاه"
          description="تجربه‌تان را واضح و مرتبط با همین محصول بنویسید."
        />
        <label className="block text-sm font-medium text-gray-700">
          <span className="text-xs font-bold text-gray-700">توضیحات شما</span>
          <Textarea
            value={review}
            onChange={(event) => setReview(event.target.value)}
            disabled={submitting}
            placeholder="نکات مثبت و تجربهٔ استفاده‌تان را با دیگران به اشتراک بگذارید..."
            maxLength={2000}
            aria-invalid={Boolean(errors.review)}
            className="mt-1.5 min-h-28 border border-gray-200 bg-white text-sm leading-6 shadow-sm focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-100"
          />
          <div className="mt-1 flex min-h-5 items-start justify-between gap-2">
            <FieldError message={errors.review} />
            <span className="mr-auto shrink-0 text-[11px] text-gray-400">
              {e2p(review.length)} / ۲۰۰۰
            </span>
          </div>
        </label>
      </fieldset>

      <fieldset className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <legend className="sr-only">نقاط قوت و ضعف</legend>
        <FormSectionHeading
          icon={ListChecks}
          title="نقاط قوت و ضعف"
          description="با برچسب‌های کوتاه، نکات مثبت و منفی محصول را مشخص کنید."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TagEditor
            kind="pros"
            tags={pros}
            value={prosDraft}
            onValueChange={setProsDraft}
            onAdd={() => addTag("pros")}
            onRemove={(tag) =>
              setPros((current) => current.filter((item) => item !== tag))
            }
            error={errors.pros}
            disabled={submitting}
          />
          <TagEditor
            kind="cons"
            tags={cons}
            value={consDraft}
            onValueChange={setConsDraft}
            onAdd={() => addTag("cons")}
            onRemove={(tag) =>
              setCons((current) => current.filter((item) => item !== tag))
            }
            error={errors.cons}
            disabled={submitting}
          />
        </div>
      </fieldset>

      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          aria-live={notice.kind === "error" ? "assertive" : "polite"}
          className={cn(
            "mt-4 flex items-start gap-2 rounded-2xl border p-3 text-xs leading-6",
            notice.kind === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800",
          )}
        >
          {notice.kind === "error" ? (
            <CircleAlert className="mt-1 size-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-1 size-4 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      <div className="mt-4 flex flex-col-reverse items-stretch justify-between gap-2 border-t-2 border-gray-100 pt-4 sm:flex-row sm:items-center">
        <p className="text-[11px] leading-6 text-gray-400">
          ثبت نظر به معنی پذیرش قوانین انتشار دیدگاه‌هاست.
        </p>
        <Button
          type={isAuthenticated ? "submit" : "button"}
          disabled={submitting || isRestoring}
          onClick={() => {
            if (!isAuthenticated && !isRestoring) openAuth();
          }}
          className="min-w-36"
        >
          {submitting
            ? "در حال ارسال..."
            : isRestoring
              ? "در حال بررسی..."
              : isAuthenticated
                ? "ارسال"
                : "ورود و ارسال"}
        </Button>
      </div>
    </form>
  );
}
