/**
 * @fileoverview In-memory sliding-window rate limiter.
 *
 * Uses a Map of request timestamps keyed by (IP + route).
 * Timestamps are pruned on every check — no setInterval needed, safe for
 * Node.js and Edge runtimes.
 *
 * Caveat: state is per-process. On multi-instance / Edge deployments the
 * effective limit is (configured limit × worker count). For true global
 * rate limiting, replace the store with Redis/Upstash.
 */

/** @type {Map<string, number[]>} */
const store = new Map()

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a rate limiter config object (limit + window).
 *
 * @param {number} limit     Maximum requests allowed within windowMs
 * @param {number} windowMs  Sliding window size in milliseconds
 * @returns {{ limit: number, windowMs: number }}
 */
export function createRateLimiter(limit, windowMs) {
  return { limit, windowMs }
}

/**
 * Checks whether an identifier has exceeded its rate limit.
 * Prunes stale entries on each invocation (sliding window).
 *
 * @param {string} identifier  Unique key — typically `${ip}:${routePrefix}`
 * @param {{ limit: number, windowMs: number }} limiter
 * @returns {{ allowed: boolean, retryAfter: number }}
 */
export function checkRateLimit(identifier, limiter) {
  const now         = Date.now()
  const { limit, windowMs } = limiter
  const windowStart = now - windowMs

  // Prune timestamps that have fallen outside the window
  const timestamps = (store.get(identifier) ?? []).filter((t) => t > windowStart)

  if (timestamps.length >= limit) {
    // Oldest in-window timestamp — how long until the window slides past it
    const oldest     = Math.min(...timestamps)
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000)
    store.set(identifier, timestamps)
    return { allowed: false, retryAfter: Math.max(retryAfter, 1) }
  }

  timestamps.push(now)
  store.set(identifier, timestamps)
  return { allowed: true, retryAfter: 0 }
}

/**
 * Extracts the real client IP from request headers.
 * Checks x-forwarded-for → x-real-ip → falls back to '127.0.0.1'.
 *
 * @param {import('next/server').NextRequest} request
 * @returns {string}
 */
export function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0].trim()
    if (first) return first
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP.trim()

  return '127.0.0.1'
}
