/**
 * @fileoverview Dynamic XML sitemap.
 *
 * Next.js App Router — this file is automatically served at /sitemap.xml.
 * Includes static public pages and dynamic charity profile pages fetched
 * from the database at build time (ISR-friendly).
 *
 * Excludes: /dashboard, /admin, /api, /(auth) routes.
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://golfgives.com'

/** @returns {Promise<import('next').MetadataRoute.Sitemap>} */
export default async function sitemap() {
  const now = new Date()

  // ── Static routes ──────────────────────────────────────────────────────────
  const staticRoutes = [
    {
      url:               `${APP_URL}/`,
      lastModified:      now,
      changeFrequency:   'weekly',
      priority:          1.0,
    },
    {
      url:               `${APP_URL}/how-it-works`,
      lastModified:      now,
      changeFrequency:   'monthly',
      priority:          0.8,
    },
    {
      url:               `${APP_URL}/pricing`,
      lastModified:      now,
      changeFrequency:   'monthly',
      priority:          0.9,
    },
    {
      url:               `${APP_URL}/charities`,
      lastModified:      now,
      changeFrequency:   'weekly',
      priority:          0.8,
    },
  ]

  // ── Dynamic charity pages ──────────────────────────────────────────────────
  let charityRoutes = []
  try {
    const { data: charities } = await supabaseAdmin
      .from('charities')
      .select('id, updated_at')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    charityRoutes = (charities ?? []).map((charity) => ({
      url:             `${APP_URL}/charities/${charity.id}`,
      lastModified:    charity.updated_at ? new Date(charity.updated_at) : now,
      changeFrequency: 'weekly',
      priority:        0.6,
    }))
  } catch {
    // Non-fatal — static sitemap is returned without charity pages if DB is unreachable
  }

  return [...staticRoutes, ...charityRoutes]
}
