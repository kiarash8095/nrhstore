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
    <div className="overflow-hidden bg-gray-50">
      <Image src={banner.src} alt={banner.title} width={banner.width} height={banner.height} sizes={sizes}
        className="block h-auto w-full object-contain" />
    </div>
    <div className="flex min-h-9 items-center justify-between gap-2 px-3 py-1 sm:px-4">
      <div className="min-w-0">
        <h2 className={'truncate font-semibold leading-6 text-gray-800 ' + (compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm')}>{presentation.title}</h2>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-orange-700 transition-colors group-hover:text-orange-800 sm:text-xs">
        <span>مشاهده</span>
        <ArrowLeft className="size-3.5" aria-hidden="true" />
      </span>
    </div>
  </Link>;
}
