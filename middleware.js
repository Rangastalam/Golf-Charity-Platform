/**
 * @fileoverview Next.js route protection middleware.
 *
 * Responsibilities:
 *  1. Attach security headers to every response.
 *  2. Rate-limit API routes by IP + route prefix.
 *  3. Refresh the Supabase session cookie on every authenticated request.
 *  4. Guard protected and admin routes (auth + role check).
 *  5. Attach x-user-id / x-user-is-admin headers for downstream handlers.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse }       from 'next/server'
import { checkRateLimit, createRateLimiter, getClientIP } from '@/lib/rateLimit'

// ─── Security headers ─────────────────────────────────────────────────────────

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co https://api.stripe.com",
  "frame-src https://js.stripe.com",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

/**
 * Applies security headers to an existing NextResponse.
 * Mutates the response headers in-place.
 *
 * @param {NextResponse} response
 * @returns {NextResponse}
 */
function applySecurityHeaders(response) {
  const h = response.headers
  h.set('X-Frame-Options',           'DENY')
  h.set('X-Content-Type-Options',    'nosniff')
  h.set('Referrer-Policy',           'strict-origin-when-cross-origin')
  h.set('Permissions-Policy',        'camera=(), microphone=()')
  h.set('Content-Security-Policy',   CSP)
  h.set('X-DNS-Prefetch-Control',    'off')
  h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  return response
}

// ─── Rate limiters ────────────────────────────────────────────────────────────

const ONE_MINUTE = 60_000

const limiters = {
  auth:    createRateLimiter(10, ONE_MINUTE),   // /api/auth/*
  scores:  createRateLimiter(30, ONE_MINUTE),   // /api/scores
  draws:   createRateLimiter(20, ONE_MINUTE),   // /api/draws
  default: createRateLimiter(50, ONE_MINUTE),   // all other /api/* routes
}

/**
 * Returns the rate limiter for the given pathname, or null if the route
 * is exempt from rate limiting (e.g. webhooks).
 *
 * @param {string} pathname
 * @returns {{ limit: number, windowMs: number }|null}
 */
function getLimiter(pathname) {
  if (pathname.startsWith('/api/webhooks/')) return null           // no limit
  if (pathname.startsWith('/api/auth/'))    return limiters.auth
  if (pathname.startsWith('/api/scores'))   return limiters.scores
  if (pathname.startsWith('/api/draws'))    return limiters.draws
  if (pathname.startsWith('/api/'))         return limiters.default
  return null
}

// ─── Route classification ─────────────────────────────────────────────────────

/** Routes that are fully public — no auth check at all. */
const PUBLIC_PATHS = new Set([
  '/',
  '/charities',
  '/how-it-works',
  '/pricing',
  '/login',
  '/signup',
  '/not-found',
  '/terms',
  '/privacy',
])

/** Route prefixes that are fully public (static assets, public APIs). */
const PUBLIC_PREFIXES = [
  '/_next/',
  '/favicon',
  '/api/webhooks',   // Stripe webhook — verified by signature, not session
  '/api/auth/welcome',
  '/api/health',
]

/** Route prefixes that require a valid session. */
const PROTECTED_PREFIXES = ['/dashboard']

/** Route prefixes that require is_admin = true. */
const ADMIN_PREFIXES = ['/admin', '/api/admin']

/**
 * Routes that are protected only for specific HTTP methods.
 * GET requests remain public; mutating methods require a session.
 *
 * @type {Array<{ path: string, methods: string[] }>}
 */
const METHOD_PROTECTED = [
  { path: '/api/scores',    methods: ['POST', 'PUT', 'PATCH', 'DELETE'] },
  { path: '/api/charities', methods: ['POST', 'PUT', 'PATCH', 'DELETE'] },
  { path: '/api/draws',     methods: ['POST', 'PUT', 'PATCH'] },
]

// ─── Classification helpers ───────────────────────────────────────────────────

/** @param {string} pathname @returns {boolean} */
function isPublicPath(pathname) {
  if (PUBLIC_PATHS.has(pathname)) return true
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}

/** @param {string} pathname @returns {boolean} */
function isAdminPath(pathname) {
  return ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
}

/** @param {string} pathname @returns {boolean} */
function isAlwaysProtectedPath(pathname) {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
}

/**
 * @param {string} pathname
 * @param {string} method
 * @returns {boolean}
 */
function isMethodProtected(pathname, method) {
  return METHOD_PROTECTED.some(
    (rule) => pathname.startsWith(rule.path) && rule.methods.includes(method)
  )
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<import('next/server').NextResponse>}
 */
export async function middleware(request) {
  const { pathname } = request.nextUrl
  const method       = request.method

  // ── 1. Rate limiting ─────────────────────────────────────────────────────
  const limiter = getLimiter(pathname)
  if (limiter) {
    const ip         = getClientIP(request)
    const prefix     = pathname.split('/').slice(0, 3).join('/')
    const identifier = `${ip}:${prefix}`
    const { allowed, retryAfter } = checkRateLimit(identifier, limiter)

    if (!allowed) {
      const rateLimitResponse = NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        {
          status:  429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      )
      return applySecurityHeaders(rateLimitResponse)
    }
  }

  // ── 2. Fully public paths — skip Supabase entirely ───────────────────────
  if (isPublicPath(pathname)) {
    return applySecurityHeaders(NextResponse.next({ request }))
  }

  // ── 3. Build Supabase client that refreshes session cookies ──────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: use getUser() — not getSession() — to validate the JWT
  // server-side. getSession() only reads from the cookie and can be spoofed.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  const hasSession = !authError && !!user

  // ── 4. Determine if this request needs protection ─────────────────────────
  const needsAuth =
    isAlwaysProtectedPath(pathname) ||
    isAdminPath(pathname) ||
    isMethodProtected(pathname, method)

  if (!needsAuth) {
    if (hasSession) supabaseResponse.headers.set('x-user-id', user.id)
    return applySecurityHeaders(supabaseResponse)
  }

  // ── 5. Redirect unauthenticated users to /login ───────────────────────────
  if (!hasSession) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return applySecurityHeaders(NextResponse.redirect(loginUrl))
  }

  // ── 6. Admin path: verify is_admin in profiles ────────────────────────────
  if (isAdminPath(pathname)) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Middleware: profile fetch failed', profileError.message)
      return applySecurityHeaders(NextResponse.redirect(new URL('/login', request.url)))
    }

    if (!profile?.is_admin) {
      return applySecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)))
    }

    supabaseResponse.headers.set('x-user-id',       user.id)
    supabaseResponse.headers.set('x-user-is-admin', 'true')
    return applySecurityHeaders(supabaseResponse)
  }

  // ── 7. Protected path: authenticated, non-admin route ────────────────────
  supabaseResponse.headers.set('x-user-id',       user.id)
  supabaseResponse.headers.set('x-user-is-admin', 'false')
  return applySecurityHeaders(supabaseResponse)
}

// ─── Matcher ──────────────────────────────────────────────────────────────────
// Run on every request except static files and Next.js internals.

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
