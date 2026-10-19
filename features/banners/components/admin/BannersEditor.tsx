"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BANNER_UPDATE_EVENT } from "@/features/banners/components/HomeBannersProvider";
import { bannerGroupLabels,bannerGroups,bannerListSchema,MAX_BANNERS,MAX_IMAGE_BYTES,type BannerDocument,type BannerGroup,type SiteBanner } from "@/features/banners/schemas/banner.schema";
import { e2p } from "@/utils/numbers";
import { ArrowDown,ArrowUp,ExternalLink,ImagePlus,Loader2,LogOut,Save,ShieldCheck,Trash2,Undo2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect,useRef,useState } from "react";
import { adminRequest,AdminRequestError } from "../../api/admin.api";
import { useAdminToast } from "../../hooks/use-admin-toast";
import { useHydrated } from "../../hooks/use-hydrated";

export function BannersEditor({ initialDocument }: { initialDocument: BannerDocument }) {
  const hydrated = useHydrated();
  const [saved, setSaved] = useState(initialDocument);
  const [draft, setDraft] = useState(initialDocument.banners);
  const [busy, setBusy] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { notify, toastElement } = useAdminToast();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved.banners);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function reportError(error: unknown) {
    const message = error instanceof Error ? error.message : "عملیات انجام نشد؛ دوباره تلاش کنید.";
    if (error instanceof AdminRequestError && error.status === 401) setSessionExpired(true);
    setErrorMessage(message);
    notify(message, "error");
  }

  function updateBanner(id: string, patch: Partial<SiteBanner>) {
    setDraft((current) => current.map((banner) => banner.id === id ? { ...banner, ...patch } : banner));
  }

  function moveBanner(id: string, direction: -1 | 1) {
    setDraft((current) => {
      const result = [...current];
      const index = result.findIndex((banner) => banner.id === id);
      const groupIndices = result.flatMap((banner, i) => banner.group === result[index].group ? [i] : []);
      const otherIndex = groupIndices[groupIndices.indexOf(index) + direction];
      if (otherIndex === undefined) return current;
      [result[index], result[otherIndex]] = [result[otherIndex], result[index]];
      return result;
    });
  }

  async function upload(file: File | undefined, group: BannerGroup, id?: string) {
    if (!file || busyRef.current || sessionExpired) return;
    if (file.size > MAX_IMAGE_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      notify("تصویر JPG، PNG یا WebP با حجم حداکثر ۵ مگابایت انتخاب کنید.", "error");
      return;
    }
    if (!id && draft.length >= MAX_BANNERS) { notify("حداکثر ۴۰ بنر می‌توانید داشته باشید.", "error"); return; }
    busyRef.current = true;
    setBusy(id || `add-${group}`);
    setErrorMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      const image = await adminRequest<Pick<SiteBanner, "src" | "width" | "height">>("/api/banners-admin/upload", { method: "POST", body: form });
      if (id) updateBanner(id, image);
      else setDraft((current) => [...current, { id: crypto.randomUUID(), group, title: bannerGroupLabels[group], ...image }]);
      notify("تصویر آماده شد. برای نمایش در سایت، ذخیره تغییرات را بزنید.");
    } catch (error) { reportError(error); }
    finally { setBusy(null); busyRef.current = false; }
  }

  async function save() {
    if (busyRef.current || !dirty || sessionExpired) return;
    const parsed = bannerListSchema.safeParse(draft);
    if (!parsed.success) { notify(parsed.error.issues[0]?.message || "اطلاعات بنرها معتبر نیست.", "error"); return; }
    busyRef.current = true;
    setBusy("save");
    setErrorMessage("");
    try {
      const document = await adminRequest<BannerDocument & { message: string }>("/api/banners-admin", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: saved.revision, banners: parsed.data }),
      });
      setSaved({ revision: document.revision, banners: document.banners });
      setDraft(document.banners);
      notify(document.message);
      try {
        if (typeof BroadcastChannel !== "undefined") {
          const channel = new BroadcastChannel(BANNER_UPDATE_EVENT);
          channel.postMessage(document.revision);
          channel.close();
        }
      } catch { /* Cross-tab notifications must not turn a successful save into an error. */ }
      try { localStorage.setItem(BANNER_UPDATE_EVENT, document.revision); } catch { /* Storage may be disabled. */ }
    } catch (error) { reportError(error); }
    finally { setBusy(null); busyRef.current = false; }
  }

  async function logout() {
    if (busyRef.current || (dirty && !window.confirm("تغییرات ذخیره نشده‌اند. از پنل خارج می‌شوید؟"))) return;
    busyRef.current = true;
    setBusy("logout");
    try {
      await adminRequest("/api/banners-admin/session", { method: "DELETE" });
      window.location.replace("/banners-admin/login");
    } catch (error) { reportError(error); setBusy(null); busyRef.current = false; }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-28 sm:px-6" dir="rtl">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white"><ShieldCheck className="size-6" /></div>
          <div><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">مدیریت بنرهای فروشگاه</h1><p className="mt-2 text-sm leading-7 text-slate-500">تصاویر و عنوان‌ها را ویرایش کنید و در پایان تغییرات را ذخیره کنید.</p></div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" prefetch={false} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"><ExternalLink className="size-4" /> مشاهده سایت</Link>
          <Button variant="ghost" disabled={Boolean(busy)} onClick={logout}><LogOut className="size-4" /> خروج</Button>
        </div>
      </header>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm">
        <span className="text-slate-600">{e2p(draft.length)} بنر در {e2p(bannerGroups.length)} بخش</span>
        <span className={dirty ? "text-amber-700" : "text-emerald-700"}>{dirty ? "تغییرات ذخیره‌نشده دارید" : "همه تغییرات ذخیره شده‌اند"}</span>
      </div>
      <p className="mb-6 text-sm leading-7 text-slate-500">فرمت‌های مجاز: JPG، PNG و WebP؛ حداکثر حجم هر تصویر ۵ مگابایت. برای بهترین نمایش، نسبت تصویر فعلی را حفظ کنید.</p>
      {errorMessage && <p role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-800">{errorMessage}</p>}
      {sessionExpired && <p className="mb-6 rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-900">برای ادامه، <Link href="/banners-admin/login" target="_blank" className="font-bold underline">در تب دیگری وارد شوید</Link> و سپس <button type="button" className="font-bold underline" onClick={() => { setSessionExpired(false); setErrorMessage(""); }}>دوباره تلاش کنید</button>. پیش‌نویس این صفحه حفظ شده است.</p>}
      <fieldset disabled={Boolean(busy) || sessionExpired || !hydrated} className="min-w-0 space-y-10">
        {bannerGroups.map((group) => {
          const banners = draft.filter((banner) => banner.group === group);
          return (
            <section key={group} aria-labelledby={`group-${group}`}>
              <div className="mb-4 flex items-center gap-3"><h2 id={`group-${group}`} className="text-lg font-bold text-slate-900">{bannerGroupLabels[group]}</h2><span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs text-slate-600">{e2p(banners.length)}</span></div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {banners.map((banner, index) => (
                  <article key={banner.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="relative flex aspect-[16/7] items-center justify-center border-b border-slate-100 bg-slate-50">
                      <Image src={banner.src} alt={banner.title || "پیش‌نمایش بنر"} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px" className="object-contain" />
                      {busy === banner.id && <div className="absolute inset-0 flex items-center justify-center bg-white/80"><Loader2 className="size-8 animate-spin text-slate-600" /></div>}
                    </div>
                    <div className="space-y-4 p-4">
                      <div className="space-y-2"><label htmlFor={`title-${banner.id}`} className="text-xs font-medium text-slate-600">عنوان و متن جایگزین تصویر</label><Input id={`title-${banner.id}`} value={banner.title} maxLength={160} onChange={(event) => updateBanner(banner.id, { title: event.target.value })} className="rounded-xl border-slate-200" /></div>
                      <div className="space-y-2"><label htmlFor={`file-${banner.id}`} className="text-xs font-medium text-slate-600">تغییر تصویر</label><input id={`file-${banner.id}`} type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-xs text-slate-500 file:ml-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void upload(file, group, banner.id); }} /></div>
                      <p className="text-xs text-slate-400">ابعاد: {e2p(banner.width)} × {e2p(banner.height)} پیکسل</p>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <div className="flex gap-1"><Button size="icon-sm" variant="outline" aria-label={`انتقال ${banner.title} به جایگاه قبلی`} disabled={index === 0} onClick={() => moveBanner(banner.id, -1)}><ArrowUp /></Button><Button size="icon-sm" variant="outline" aria-label={`انتقال ${banner.title} به جایگاه بعدی`} disabled={index === banners.length - 1} onClick={() => moveBanner(banner.id, 1)}><ArrowDown /></Button></div>
                        <Button variant="destructive" size="sm" onClick={() => setDraft((current) => current.filter((item) => item.id !== banner.id))}><Trash2 className="size-4" /> حذف بنر</Button>
                      </div>
                    </div>
                  </article>
                ))}
                <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-6 text-center">
                  {busy === `add-${group}` ? <Loader2 className="size-7 animate-spin text-slate-400" /> : <ImagePlus className="size-7 text-slate-400" />}
                  <label htmlFor={`add-${group}`} className="text-sm font-medium text-slate-700">افزودن بنر به این بخش</label>
                  {!banners.length && <p className="text-xs leading-6 text-slate-400">این بخش در سایت نمایش داده نمی‌شود.</p>}
                  <input id={`add-${group}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={draft.length >= MAX_BANNERS} className="w-full max-w-60 text-xs text-slate-500 file:ml-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void upload(file, group); }} />
                </div>
              </div>
            </section>
          );
        })}
      </fieldset>
      <div className="sticky bottom-24 z-40 mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-4">
        <p className="text-sm text-slate-500">{busy === "save" ? "در حال ذخیره تغییرات…" : dirty ? "تغییرات پس از ذخیره در سایت نمایش داده می‌شوند." : "بنرها با نسخه فعلی سایت هماهنگ‌اند."}</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" disabled={!dirty || Boolean(busy)} onClick={() => { setDraft(saved.banners); setErrorMessage(""); }}><Undo2 className="size-4" /> بازگردانی</Button>
          <Button disabled={!dirty || Boolean(busy) || sessionExpired} onClick={save} className="h-11 rounded-xl bg-slate-900 px-5 text-white">{busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} ذخیره تغییرات</Button>
        </div>
      </div>
      {toastElement}
    </main>
  );
}
