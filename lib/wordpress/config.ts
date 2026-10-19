import 'server-only';

export function getWordPressApiUrl() {
  // Keep existing installations working while the CMS moves to its own origin.
  const value = process.env.WP_API_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.WP_AUTH_BASE_URL || 'https://nrhstore.ir/wp-json';
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('WP_API_URL must be an HTTP(S) REST API URL without credentials or query parameters.');
  }
  return url.toString().replace(/\/+$/, '').replace(/\/wc\/store\/v1$/, '');
}

export function getStoreApiUrl() {
  return `${getWordPressApiUrl()}/wc/store/v1`;
}
