import type { MetadataRoute } from 'next';
import { site } from '@/configs/site';

export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_INDEXING_ENABLED !== 'true') return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/account', '/banners-admin', '/api/'] }, sitemap: `${site.url}/sitemap.xml` };
}
