import 'server-only';
import type { NextRequest } from 'next/server';
import { authAdapter } from './backend/adapter';
import { isEmptyJar, jarToCookieHeader, readJarFromRequest } from './cookies';

// Public server-only bridge; cart never decrypts authentication cookies itself.
export async function getCartAuthContext(request: NextRequest) {
  const jar = readJarFromRequest(request);
  if (isEmptyJar(jar)) return null;
  const session = await authAdapter.getSession(jar);
  if (!session) return null;
  return {
    userId: session.user.id,
    headers: { Cookie: jarToCookieHeader(session.jar), 'X-WP-Nonce': session.jar.wp_rest || '' },
  };
}
