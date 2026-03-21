/**
 * @fileoverview Public charity listing page.
 *
 * Server component — fetches all active charities SSR,
 * passes to CharitiesClient for real-time search and Framer Motion animations.
 */

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'
import CharitiesClient from './CharitiesClient'

export const metadata = {
  title: 'Our Charities',
  description:
    'GolfGives partners with verified charities. 40% of every subscription contributes directly to causes our members care about.',
}

export default async function CharitiesPage() {
  const today = new Date().toISOString().slice(0, 10)

  const { data: charities, error } = await supabaseAdmin
    .from('charities')
    .select(
      `id, name, description, image_url, website_url, is_featured, created_at,
       charity_events ( id, title, event_date )`
    )
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('name',        { ascending: true  })

  // Attach only upcoming events to each charity
  const enriched = error
    ? []
    : (charities ?? []).map((c) => ({
        ...c,
        charity_events: (c.charity_events ?? [])
          .filter((e) => e.event_date >= today)
          .sort((a, b) => a.event_date.localeCompare(b.event_date)),
      }))

  return (
    <div className="bg-white min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-green-950 py-20 px-4 text-center">
        <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-3">
          Making an impact
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
          Where your subscription goes
        </h1>
        <p className="text-green-300 text-lg max-w-2xl mx-auto leading-relaxed">
          40% of every subscription is donated directly to the charities below —
          chosen and supported by our members. No admin fees, no middlemen.
        </p>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      <section className="bg-green-900 py-6 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 divide-x divide-green-700 text-center">
          <div className="px-4">
            <p className="text-2xl font-black text-white">{enriched.length}</p>
            <p className="text-green-300 text-xs mt-0.5">Partner charities</p>
          </div>
          <div className="px-4">
            <p className="text-2xl font-black text-white">40%</p>
            <p className="text-green-300 text-xs mt-0.5">of every subscription</p>
          </div>
          <div className="px-4">
            <p className="text-2xl font-black text-white">
              {enriched.reduce((n, c) => n + (c.charity_events?.length ?? 0), 0)}
            </p>
            <p className="text-green-300 text-xs mt-0.5">Upcoming events</p>
          </div>
        </div>
      </section>

      {/* ── Charity grid ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        {error ? (
          <div className="text-center text-gray-500 py-20">
            <p className="text-5xl mb-4" aria-hidden="true">⚠️</p>
            <p className="text-lg font-semibold text-gray-700">
              Could not load charities right now
            </p>
            <p className="text-sm mt-2">Please try refreshing the page.</p>
          </div>
        ) : enriched.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            <p className="text-5xl mb-4" aria-hidden="true">🤝</p>
            <p className="text-lg font-semibold text-gray-700">No charities listed yet</p>
            <p className="text-sm mt-2">
              We&apos;re onboarding new partners — check back soon.
            </p>
          </div>
        ) : (
          <CharitiesClient charities={enriched} />
        )}
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="bg-green-50 border-t border-green-100 py-16 px-4 text-center">
        <p className="text-3xl mb-4" aria-hidden="true">⛳</p>
        <h2 className="text-2xl font-bold text-green-950 mb-3">
          Play golf. Fund change.
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
          Every round you submit, every month you&apos;re subscribed —
          real money flows to the charity you choose.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="inline-block bg-green-700 hover:bg-green-800 text-white font-semibold rounded-full px-8 py-3 transition-colors"
          >
            Join GolfGives
          </Link>
          <Link
            href="/pricing"
            className="inline-block text-green-800 hover:text-green-950 font-semibold px-8 py-3 transition-colors"
          >
            View membership plans →
          </Link>
        </div>
      </section>
    </div>
  )
}
