// Keep cookie-changing requests and cart bootstrap ordered across tabs of this origin.
// Supported Next.js browsers provide Web Locks on HTTPS (and localhost).
let pending: Promise<unknown> = Promise.resolve();

export async function withStoreSessionLock<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return await navigator.locks.request('nrh-store-session', { mode: 'exclusive', ...(signal ? { signal } : {}) }, operation);
  }
  const result = pending.catch(() => undefined).then(() => {
    signal?.throwIfAborted();
    return operation();
  });
  pending = result.catch(() => undefined);
  return result;
}
