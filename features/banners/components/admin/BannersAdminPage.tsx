import { BannersEditor } from "@/features/banners/components/admin/BannersEditor";
import { isBannerAdmin } from "@/features/banners/server/admin-session";
import { readBannerDocument } from "@/features/banners/server/store";
import { redirect } from "next/navigation";



export default async function BannersAdminPage() {
  if (!(await isBannerAdmin())) redirect("/banners-admin/login");
  const document = await readBannerDocument();
  return <BannersEditor initialDocument={document} />;
}
