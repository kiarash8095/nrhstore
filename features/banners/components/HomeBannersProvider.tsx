"use client";

import { bannerDocumentSchema,type BannerDocument,type BannerGroup } from "@/features/banners/schemas/banner.schema";
import { createContext,useContext,useEffect,useState,type ReactNode } from "react";
import { BannerCard } from "./BannerCard";

export const BANNER_UPDATE_EVENT = "nrh:banners:updated";
const BannerContext = createContext<BannerDocument | null>(null);

export function HomeBannersProvider({ initialDocument, children }: { initialDocument: BannerDocument; children: ReactNode }) {
  const [document, setDocument] = useState(initialDocument);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    async function refresh() {
      if (disposed || inFlight || window.document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const response = await fetch("/api/banners", { cache: "no-store" });
        if (!response.ok) return;
        const parsed = bannerDocumentSchema.safeParse(await response.json());
        if (!disposed && parsed.success) {
          setDocument((current) => current.revision === parsed.data.revision ? current : parsed.data);
        }
      } catch {
        // Keep the visible banners during transient network failures.
      } finally {
        inFlight = false;
      }
    }
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(BANNER_UPDATE_EVENT) : null;
    if (channel) channel.onmessage = () => void refresh();
    const onStorage = (event: StorageEvent) => { if (event.key === BANNER_UPDATE_EVENT) void refresh(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    window.document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 5000);
    void refresh();
    return () => {
      disposed = true;
      // Ignore an outstanding read when it finishes; no response may update an unmounted provider.
      channel?.close();
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
      window.document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return <BannerContext.Provider value={document}>{children}</BannerContext.Provider>;
}

export function useHomeBanners(group: BannerGroup) {
  const document = useContext(BannerContext);
  if (!document) throw new Error("Home banner components must be inside HomeBannersProvider");
  return document.banners.filter((banner) => banner.group === group);
}

export function HomeBannerGroup({ group }: { group: BannerGroup }) {
  const banners = useHomeBanners(group);
  if (!banners.length) return null;
  return (
    <section className={'my-6 grid w-full gap-4 sm:my-8 ' + (group === 'hardware' ? 'md:grid-cols-2 md:gap-5' : 'grid-cols-1')} aria-label={banners[0].title} data-banner-section={group}>
      {banners.map((banner) => (
        <BannerCard key={banner.id} banner={banner} sizes={group === 'hardware' ? '(max-width: 767px) 100vw, (max-width: 1440px) 50vw, 698px' : '(max-width: 1440px) 100vw, 1416px'} />
      ))}
    </section>
  );
}
