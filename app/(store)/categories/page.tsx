import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "دسته‌بندی‌ها",
  alternates: { canonical: '/categories' },
  description:
    "فهرست دسته‌بندی محصولات نوین رایانه همدان: لپ‌تاپ، کامپیوتر و قطعات، تجهیزات شبکه، لوازم جانبی و ماشین‌های اداری.",
};

export { CategoriesPage as default } from "@/features/categories/server";
