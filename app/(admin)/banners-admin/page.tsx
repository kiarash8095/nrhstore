import type { Metadata } from "next";

export const metadata: Metadata = { title: "مدیریت بنرها | نوین رایانه همدان", robots: { index: false, follow: false } };

export { BannersAdminPage as default } from "@/features/banners/server";
