import 'server-only';
import type { NextRequest } from 'next/server';

/** Next's internal URL may use localhost even when the browser used another host. */
export function isTrustedOriginRequest(request: NextRequest, additionalOrigins: string[] = []): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  if (!origin) return true; // Non-browser clients still require valid input and authentication.
  try {
    if (new URL(origin).origin !== origin) return false;
    if (additionalOrigins.includes(origin)) return true;
    // A fixed public origin also handles HTTPS termination at a reverse proxy.
    // Alias the environment to read the startup origin at runtime, rather than
    // freezing NEXT_PUBLIC_SITE_URL into this security check during next build.
    const runtimeEnv = process.env;
    if (runtimeEnv.NEXT_PUBLIC_SITE_URL && new URL(runtimeEnv.NEXT_PUBLIC_SITE_URL).origin === origin) return true;
    const host = request.headers.get('host');
    if (!host) return origin === request.nextUrl.origin;
    if (host.length > 255 || /[\s/\\@?#,]/.test(host)) return false;
    // Browsers set Host from the request destination. Do not trust forwarded host/protocol headers.
    return origin === new URL(`${request.nextUrl.protocol}//${host}`).origin;
  } catch { return false; }
}
