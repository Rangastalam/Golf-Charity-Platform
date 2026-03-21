/**
 * @fileoverview Public pricing page — redesigned with dark theme and toggle.
 *
 * Server Component — checks auth server-side and passes `isLoggedIn` to the
 * interactive PricingCards client component.
 *
 * URL: /pricing
 */

import { cookies }                from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { REVENUE_SPLIT }          from '@/constants'
import PricingCards               from './PricingCards'

export const metadata = {
  title: 'Pricing | GolfGives',
  description: 'Choose a GolfGives plan. Every subscription funds charity donations and monthly prize draws.',
}

export default async function PricingPage() {
  let isLoggedIn = false
  try {
    const cookieStore = await cookies()
    const supabase    = createServerSupabaseClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    isLoggedIn = !!user
  } catch { /* public page — auth check failure is OK */ }

  const charityPct = Math.round(REVENUE_SPLIT.CHARITY    * 100)
  const prizePct   = Math.round(REVENUE_SPLIT.PRIZE_POOL * 100)

  return (
    <div className="bg-gray-950 text-white min-h-screen">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="pt-24 md:pt-32 pb-12 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-1.5 text-xs font-bold text-amber-400 uppercase tracking-widest mb-6">
            Transparent Pricing
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-5">
            One subscription.{' '}
            <span className="text-amber-400">Three ways to win.</span>
          </h1>
          <p className="text-base md:text-lg text-gray-400 max-w-xl mx-auto">
            Every GolfGives subscription splits three ways:{' '}
            <strong className="text-rose-400">{charityPct}% to charity</strong>,{' '}
            <strong className="text-amber-400">{prizePct}% into the prize pool</strong>,
            {' '}and 20% keeps the platform running.
          </p>
        </div>
      </section>

      {/* ── Pricing cards (client component handles toggle + checkout) ─────── */}
      <section className="pb-20 px-4">
        <PricingCards isLoggedIn={isLoggedIn} />
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────────── */}
      <section className="border-t border-gray-800/60 py-14 px-4 bg-gray-900/30">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { icon: '🔒', title: 'Stripe Secured',     body: 'All billing is handled by Stripe — we never store your card details.' },
            { icon: '🎗️', title: 'Verified Charities', body: 'Donations are transferred to registered charities by the 5th of each month.' },
            { icon: '↩',  title: 'Cancel Any Time',    body: 'Manage or cancel from your dashboard billing portal with one click.' },
          ].map(({ icon, title, body }) => (
            <div key={title}>
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-bold text-white mb-1">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 px-4 border-t border-gray-800/60">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-center mb-10 text-white">
            Billing questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'When is the monthly draw?',
                a: 'The prize draw takes place on the 28th of every month. Winners are notified by email and results are published on your dashboard.',
              },
              {
                q: 'Can I switch between monthly and yearly billing?',
                a: 'Yes — use the billing portal (Dashboard → Subscription → Manage Billing) to switch at any time. Yearly savings apply immediately on the next cycle.',
              },
              {
                q: 'What happens if I cancel mid-cycle?',
                a: "You keep full access until the end of your current billing period. No prorated refunds, but you retain all draw entries already earned.",
              },
              {
                q: 'Is there a free trial?',
                a: "We don't offer a free trial, but your first month includes a full draw entry and charity contribution. Cancel before renewal if it's not for you.",
              },
              {
                q: 'Are payments secure?',
                a: "All payments are processed by Stripe, one of the world's most trusted payment providers. We never store your card details.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-gray-800 pb-6">
                <h3 className="font-bold text-white mb-2">{q}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
