/**
 * @fileoverview Root layout — wraps the entire application.
 *
 * Provides:
 *  - Canonical metadata + Open Graph + Twitter card tags.
 *  - Inter font via next/font (no render-blocking @import).
 *  - <link rel="preconnect"> for Supabase and Stripe.
 *  - Viewport and theme-colour configuration.
 */

import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import Providers from '@/components/shared/Providers'
import './globals.css'

// ─── Fonts ────────────────────────────────────────────────────────────────────

const inter = Inter({
  subsets:  ['latin'],
  variable: '--font-inter',
  display:  'swap',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets:  ['latin'],
  variable: '--font-plus-jakarta',
  display:  'swap',
  weight:   ['400', '500', '600', '700', '800'],
})

// ─── Metadata ─────────────────────────────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://golfgives.com'

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    template: '%s | Golf Charity Platform',
    default:  'Golf Charity Platform — Play, Win, Give',
  },
  description:
    'Subscribe, track your Stableford scores, enter monthly prize draws, and give back to the charities you care about — every single month.',
  keywords: [
    'golf', 'charity', 'subscription', 'prize draw',
    'Stableford', 'golf scores', 'charity golf', 'GolfGives',
  ],
  authors:  [{ name: 'GolfGives' }],
  creator:  'GolfGives',
  metadataBase: new URL(APP_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type:        'website',
    locale:      'en_IN',
    url:         APP_URL,
    siteName:    'Golf Charity Platform',
    title:       'Golf Charity Platform — Play, Win, Give',
    description: 'Subscribe, track your Stableford scores, enter monthly prize draws, and give back to the charities you care about — every single month.',
    images: [
      {
        url:    `${APP_URL}/og-image.png`,
        width:  1200,
        height: 630,
        alt:    'Golf Charity Platform — Play, Win, Give',
      },
    ],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Golf Charity Platform — Play, Win, Give',
    description: 'Subscribe, track your Stableford scores, enter monthly prize draws, and give back to charity every month.',
    images:      [`${APP_URL}/og-image.png`],
  },
  robots: {
    index:               true,
    follow:              true,
    googleBot: {
      index:             true,
      follow:            true,
      'max-image-preview': 'large',
    },
  },
  icons: {
    icon:     '/favicon.ico',
    apple:    '/apple-touch-icon.png',
    shortcut: '/favicon-16x16.png',
  },
}

export const viewport = {
  width:        'device-width',
  initialScale: 1,
  themeColor:   '#0f0f11',
}

// ─── Layout ───────────────────────────────────────────────────────────────────

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function RootLayout({ children }) {
  const supabaseHost =
    process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : 'https://givyxheetnioivwhhcfg.supabase.co'

  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <head>
        {/* Preconnect to external origins to reduce TTFB */}
        <link rel="preconnect" href={supabaseHost} />
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href={supabaseHost} />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
