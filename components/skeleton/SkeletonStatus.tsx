interface SkeletonStatusProps {
  /** متن اعلام‌شده به صفحه‌خوان‌ها هنگام بارگذاری */
  label?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * پوسته‌ی مشترک اسکلتون‌ها: وضعیت «در حال بارگذاری» را برای صفحه‌خوان‌ها اعلام می‌کند
 * تا کاربر بفهمد صفحه در حال دریافت محتواست، نه اینکه محتوایی ندارد.
 */
export function SkeletonStatus({
  label = "در حال بارگذاری…",
  className,
  children,
}: SkeletonStatusProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={className}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
