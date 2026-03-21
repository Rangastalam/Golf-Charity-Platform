/**
 * @fileoverview Next.js configuration — production-ready.
 *
 * Performance:
 *  - Image optimisation with Supabase storage domain whitelisted.
 *  - Response compression enabled.
 *  - X-Powered-By header removed.
 *
 * Security:
 *  - Security headers duplicated here as a fallback for cases where middleware
 *    is bypassed (e.g. static file serving, CDN misconfigurations).
 *
 * Env validation:
 *  - All required environment variables are checked at startup.
 *    Missing variables throw immediately with a clear error message.
 */

// ─── Required environment variable validation ─────────────────────────────────
// This runs before Next.js boots — a missing var fails fast with a human-readable error.

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_MONTHLY_PRICE_ID',
  'STRIPE_YEARLY_PRICE_ID',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'NEXT_PUBLIC_APP_URL',
]

const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
if (missingVars.length > 0) {
  throw new Error(
    `\n\n❌  Missing required environment variables:\n` +
    missingVars.map((v) => `     • ${v}`).join('\n') +
    `\n\nCopy .env.production.example to .env.local and fill in all values.\n`
  )
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_HOSTNAME = SUPABASE_URL
  ? new URL(SUPABASE_URL).hostname
  : 'placeholder.supabase.co'

const CSP_HEADER = [
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

const securityHeaders = [
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=()' },
  { key: 'X-DNS-Prefetch-Control',    value: 'off' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Content-Security-Policy',   value: CSP_HEADER },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── React ──────────────────────────────────────────────────────────────────
  reactStrictMode: true,

  // ── Performance ────────────────────────────────────────────────────────────
  poweredByHeader: false,
  compress:        true,

  // ── Image optimisation ─────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: SUPABASE_HOSTNAME,
        pathname: '/storage/v1/object/public/**',
      },
      {
        // Wildcard for other Supabase project subdomains
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats:  ['image/avif', 'image/webp'],
    // Default device sizes for responsive images
    deviceSizes:  [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes:   [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // ── Security headers (backup to middleware) ────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  // ── Experimental ──────────────────────────────────────────────────────────
  experimental: {
    // Optimise package imports for large icon / component libraries
    optimizePackageImports: ['framer-motion', 'recharts'],
  },
}

export default nextConfig
