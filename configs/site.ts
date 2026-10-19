function siteOrigin(value: string) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without a path.');
  }
  return url.origin;
}

export const site = {
  url: siteOrigin(process.env.NEXT_PUBLIC_SITE_URL || 'https://nrhstore.ir'),
  name: 'نوین رایانه همدان',
  description: 'خرید لپ‌تاپ، قطعات کامپیوتر، تجهیزات شبکه، لوازم جانبی و ماشین‌های اداری از نوین رایانه همدان.',
};

export function absoluteUrl(path: string) {
  return new URL(path, `${site.url}/`).toString();
}
