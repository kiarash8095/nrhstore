import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { SiteBanner } from '../schemas/banner.schema';
import { getBannerPresentation } from '../utils/banner-presentation';

export function BannerCard({ banner, sizes, compact = false }: { banner: SiteBanner; sizes: string; compact?: boolean }) {
  const presentation = getBannerPresentation(banner);
  return <Link href={presentation.href} aria-label={presentation.title + '؛ مشاهده محصولات'}
    className="group block min-w-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-4 motion-reduce:transition-none sm:rounded-3xl"
    data-banner-card={banner.id}>
    <div className={'relative overflow-hidden bg-gray-100 ' + (compact ? 'aspect-[16/9]' : banner.group === 'hardware' ? 'h-[clamp(200px,26vw,320px)]' : 'h-[clamp(180px,16vw,230px)]')}>
      <Image src={banner.src} alt={banner.title} fill sizes={sizes}
        className="object-cover object-center motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.015]" />
    </div>
    <div className="flex min-h-11 items-center justify-between gap-2 px-3 py-2 sm:px-4">
      <div className="min-w-0">
        <h2 className="truncate text-xs font-semibold leading-6 text-gray-800 sm:text-sm">{presentation.title}</h2>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-orange-700 transition-colors group-hover:text-orange-800 sm:text-xs">
        <span>مشاهده</span>
        <ArrowLeft className="size-3.5" aria-hidden="true" />
      </span>
    </div>
  </Link>;
}
