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
    <div className="overflow-hidden bg-gray-100">
      <Image src={banner.src} alt={banner.title} width={banner.width} height={banner.height} sizes={sizes}
        className="block h-auto w-full motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.015]" />
    </div>
    <div className={'flex items-center justify-between gap-3 ' + (compact ? 'px-4 py-3.5' : 'px-4 py-4 sm:px-6')}>
      <div className="min-w-0">
        <h2 className={'font-bold leading-7 text-gray-800 ' + (compact ? 'text-sm' : 'text-sm sm:text-base')}>{presentation.title}</h2>
        {!compact && <p className="mt-1 text-xs leading-6 text-gray-500">{presentation.description}</p>}
      </div>
      <span className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-orange-700">
        <span className={compact ? 'hidden lg:inline' : 'hidden sm:inline'}>مشاهده کالاها</span>
        <span className="flex size-9 items-center justify-center rounded-full bg-orange-50 transition-colors group-hover:bg-orange-600 group-hover:text-white motion-reduce:transition-none"><ArrowLeft className="size-4" aria-hidden="true" /></span>
      </span>
    </div>
  </Link>;
}
