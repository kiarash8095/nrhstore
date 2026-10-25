import "server-only";

const REVIEW_REQUEST_TTL_MS = 10 * 60_000;
const MAX_IDEMPOTENCY_ENTRIES = 1_000;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;

interface IdempotencyEntry<T> {
  fingerprint: string;
  promise: Promise<T>;
  expiresAt: number;
}

const entries = new Map<string, IdempotencyEntry<unknown>>();

function sweep(now: number) {
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key);
  }
}

export function readReviewIdempotencyKey(request: Request): string | null | false {
  const raw = request.headers.get("idempotency-key")?.trim();
  if (!raw) return null;
  return IDEMPOTENCY_KEY_PATTERN.test(raw) ? raw : false;
}

/**
 * Coalesces concurrent submissions and replays a successful result for the
 * same logical review. The map is intentionally process-local, matching the
 * existing in-memory rate limiter; a shared store is required for a cluster.
 */
export function getOrCreateReviewRequest<T>(
  key: string,
  fingerprint: string,
  work: () => Promise<T>,
  shouldCache: (result: T) => boolean,
): { kind: "new" | "replay" | "conflict"; promise?: Promise<T> } {
  const now = Date.now();
  sweep(now);

  const existing = entries.get(key);
  if (existing) {
    if (existing.fingerprint !== fingerprint) return { kind: "conflict" };
    return { kind: "replay", promise: existing.promise as Promise<T> };
  }

  const promise = Promise.resolve()
    .then(work)
    .then(result => {
      if (!shouldCache(result)) {
        const current = entries.get(key);
        if (current?.promise === promise) entries.delete(key);
      }
      return result;
    })
    .catch(error => {
      const current = entries.get(key);
      if (current?.promise === promise) entries.delete(key);
      throw error;
    });

  entries.set(key, { fingerprint, promise, expiresAt: now + REVIEW_REQUEST_TTL_MS });

  if (entries.size > MAX_IDEMPOTENCY_ENTRIES) {
    const oldestKey = entries.keys().next().value;
    if (oldestKey) entries.delete(oldestKey);
  }

  return { kind: "new", promise };
}

