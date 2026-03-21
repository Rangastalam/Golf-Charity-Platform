/**
 * @fileoverview GolfGives homepage — server component.
 *
 * Fetches platform stats, featured charity, and current prize pool server-side.
 * Delegates animated sections to client components.
 * Charity-first design: impact leads, golf is the mechanism.
 */

import Link                 from 'next/link'
import { cookies }          from 'next/headers'
import { supabaseAdmin }    from '@/lib/supabase-admin'
import { ROUTES, REVENUE_SPLIT, PRIZE_DISTRIBUTION } from '@/constants'
import Navbar               from '@/components/shared/Navbar'
import Footer               from '@/components/shared/Footer'
import HeroCounter          from '@/components/public/HeroCounter'
import HeroParticles        from '@/components/public/HeroParticles'
import PrizePoolCard        from '@/components/public/PrizePoolCard'
import HowItWorksSection    from '@/components/public/HowItWorksSection'
import TestimonialsSection  from '@/components/public/TestimonialsSection'

export const metadata = {
  title: 'GolfGives — Play Golf. Fund Lives. Win Big.',
  description: 'A golf subscription platform where every member plays, wins, and gives — every single month.',
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function fetchStats() {
  try {
    const now        = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const [subsRes, charityRes, prizesRes] = await Promise.all([
      supabaseAdmin.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('charity_contributions').select('amount'),
      supabaseAdmin.from('winners').select('prize_amount').eq('payment_status', 'paid'),
    ])

    const totalCharity = (charityRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)
    const totalPrizes  = (prizesRes.data  ?? []).reduce((s, r) => s + Number(r.prize_amount ?? 0), 0)

    return {
      subscribers: subsRes.count     ?? 0,
      totalCharity,
      totalPrizes,
    }
  } catch {
    return { subscribers: 0, totalCharity: 0, totalPrizes: 0 }
  }
}

async function fetchFeaturedCharity() {
  try {
    const { data } = await supabaseAdmin
      .from('charities')
      .select('id, name, description, logo_url, website_url')
      .eq('is_featured', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data ?? null
  } catch {
    return null
  }
}

async function fetchCurrentPrizePool() {
  try {
    const now      = new Date()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const { data: draw } = await supabaseAdmin
      .from('draws')
      .select('id, prize_pools(*)')
      .eq('month', monthStr)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!draw?.prize_pools) return null

    const pools = Array.isArray(draw.prize_pools) ? draw.prize_pools : [draw.prize_pools]
    const total = pools.reduce((s, p) => s + Number(p.total_pool ?? 0), 0)

    return {
      total,
      jackpot:  Math.round(total * PRIZE_DISTRIBUTION.FIRST),
      second:   Math.round(total * PRIZE_DISTRIBUTION.SECOND),
      third:    Math.round(total * PRIZE_DISTRIBUTION.THIRD),
    }
  } catch {
    return null
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [stats, charity, prizePool] = await Promise.all([
    fetchStats(),
    fetchFeaturedCharity(),
    fetchCurrentPrizePool(),
  ])

  const jackpot = prizePool?.jackpot ?? 24600
  const second  = prizePool?.second  ?? 12300
  const third   = prizePool?.third   ?? 4100

  return (
    <div className="bg-gray-950 text-white min-h-screen">
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Animated background */}
        <HeroParticles />

        {/* Radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(251,191,36,0.08),transparent)] pointer-events-none" />

        <div className="relative z-10 text-center max-w-4xl mx-auto pt-16">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Charity-Powered Golf</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            Play Golf.{' '}
            <span className="text-amber-400">Fund Lives.</span>
            <br className="hidden sm:block" />
            {' '}Win Big.
          </h1>

          {/* Subheading */}
          <p className="text-base md:text-lg text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Subscribe once. Every month your rounds fuel real charities, fill a prize pool, and enter you into a live draw — automatically.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href={ROUTES.SIGNUP}
              className="px-8 py-4 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black text-base rounded-2xl transition-all hover:scale-105 active:scale-95 min-h-[52px] flex items-center justify-center shadow-amber-400/25 shadow-lg"
            >
              Start Playing →
            </Link>
            <Link
              href={ROUTES.HOW_IT_WORKS}
              className="px-8 py-4 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-semibold text-base rounded-2xl transition-colors min-h-[52px] flex items-center justify-center"
            >
              See How It Works
            </Link>
          </div>

          {/* Animated counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 py-8 border-t border-gray-800/60">
            <HeroCounter
              value={stats.subscribers}
              label="Active Players"
              suffix="+"
            />
            <HeroCounter
              value={stats.totalCharity}
              label="Donated to Charity"
              prefix="₹"
            />
            <HeroCounter
              value={stats.totalPrizes}
              label="Prize Winnings Paid"
              prefix="₹"
            />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
          <div className="w-px h-10 bg-gradient-to-b from-gray-500 to-transparent animate-pulse" />
          <span className="text-xs text-gray-500 uppercase tracking-widest">Scroll</span>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <HowItWorksSection />

      {/* ── FEATURED CHARITY ──────────────────────────────────────────────── */}
      {charity && (
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Section label */}
            <div className="text-center mb-10">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Featured Cause</span>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mt-2 text-white">
                Your game. Their future.
              </h2>
              <p className="text-gray-400 text-sm md:text-base mt-3 max-w-lg mx-auto">
                This month's featured charity receives 40% of every subscription.
              </p>
            </div>

            {/* Charity card */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-rose-900/40 rounded-3xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-8">
              {/* Logo or placeholder */}
              <div className="flex-shrink-0">
                {charity.logo_url ? (
                  <img
                    src={charity.logo_url}
                    alt={charity.name}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-rose-900/30 border border-rose-800/30 flex items-center justify-center text-4xl">
                    ❤️
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 text-center md:text-left">
                <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">
                  This Month's Charity
                </p>
                <h3 className="text-xl md:text-2xl font-black text-white mb-3">{charity.name}</h3>
                {charity.description && (
                  <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-6 max-w-lg">
                    {charity.description}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <Link
                    href={ROUTES.CHARITIES}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl transition-colors min-h-[44px] flex items-center justify-center"
                  >
                    Support This Charity
                  </Link>
                  {charity.website_url && (
                    <a
                      href={charity.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white font-semibold text-sm rounded-xl transition-colors min-h-[44px] flex items-center justify-center"
                    >
                      Learn More →
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── PRIZE POOL ────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 bg-gray-900/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">This Month's Draw</span>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mt-2 text-white">
              Real prizes. Every month.
            </h2>
            <p className="text-gray-400 text-sm md:text-base mt-3 max-w-md mx-auto">
              Match 3, 4, or all 5 drawn numbers. The more you match, the bigger your prize.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <PrizePoolCard matchType="five_match"  poolAmount={jackpot} isJackpot={true}  index={0} />
            <PrizePoolCard matchType="four_match"  poolAmount={second}  isJackpot={false} index={1} />
            <PrizePoolCard matchType="three_match" poolAmount={third}   isJackpot={false} index={2} />
          </div>

          <div className="text-center">
            <Link
              href={ROUTES.SIGNUP}
              className="inline-flex items-center gap-2 px-8 py-4 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black text-base rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-amber-400/25 shadow-lg min-h-[52px]"
            >
              Join The Draw →
            </Link>
            <p className="text-xs text-gray-600 mt-3">Draw takes place on the 28th of every month</p>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <TestimonialsSection />

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-br from-amber-950/40 to-gray-900 border border-amber-800/30 rounded-3xl p-8 md:p-14">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Join the Movement</span>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mt-3 mb-4 text-white">
              Join {stats.subscribers > 0 ? stats.subscribers.toLocaleString('en-IN') : 'hundreds of'} players already making a difference
            </h2>
            <p className="text-gray-400 text-sm md:text-base mb-8 max-w-lg mx-auto">
              From ₹999/month. Cancel anytime. Your first draw entry is on us.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
              <Link
                href={ROUTES.SIGNUP}
                className="w-full sm:w-auto px-10 py-4 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black text-base rounded-2xl transition-all hover:scale-105 min-h-[52px] flex items-center justify-center"
              >
                Start for ₹999/month
              </Link>
              <Link
                href={ROUTES.PRICING}
                className="text-sm font-semibold text-gray-400 hover:text-white transition-colors"
              >
                See all plans →
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap gap-4 justify-center">
              {['🔒 Stripe secured', '🎗️ Real charity impact', '↩ Cancel anytime'].map((badge) => (
                <span key={badge} className="text-xs text-gray-500">{badge}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
