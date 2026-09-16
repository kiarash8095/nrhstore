import { PageLoader } from "@/components/common/Spinner";

/**
 * لودر پیش‌فرض مسیرها؛ هدر و فوتر سرجای خود می‌مانند
 * و کاربر می‌فهمد فقط محتوای همین صفحه در حال دریافت است.
 */
export default function Loading() {
  return <PageLoader label="در حال بارگذاری صفحه…" />;
}
