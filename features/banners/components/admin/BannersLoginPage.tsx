import { AdminLoginForm } from "@/features/banners/components/admin/AdminLoginForm";
import { adminConfig,isBannerAdmin } from "@/features/banners/server/admin-session";
import { redirect } from "next/navigation";



export default async function BannersAdminLoginPage() {
  if (await isBannerAdmin()) redirect("/banners-admin");
  return <AdminLoginForm configured={Boolean(adminConfig())} />;
}
