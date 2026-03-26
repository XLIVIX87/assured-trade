/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Suitable for single-process deployments (Phase 1). For multi-instance
 * production setups, swap this out for a Redis-backed implementation.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

/**
 * Check whether the given key is within its rate limit.
 *
 * @param key      Unique identifier (e.g. userId, IP, or composite key)
 * @param limit    Maximum number of requests allowed in the window
 * @param windowMs Window duration in milliseconds
 * @returns `true` if the request is allowed, `false` if rate-limited
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now()
  const entry = store.get(key)

  // Window expired or first request — start a new window
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  // Window active and limit reached
  if (entry.count >= limit) {
    return false
  }

  // Window active, still under limit
  entry.count++
  return true
}

/**
 * Evict expired entries from the store.
 * Call periodically (e.g. every 60 s) to prevent unbounded memory growth.
 */
export function pruneRateLimitStore(): void {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}
