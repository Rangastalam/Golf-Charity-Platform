/**
 * @fileoverview How It Works — client component with all Framer Motion animations.
 * Imported by the server-component page wrapper.
 */

'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ROUTES, SUBSCRIPTION_TIERS, REVENUE_SPLIT, DRAW_DAY_OF_MONTH } from '@/constants'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const charityPct = Math.round(REVENUE_SPLIT.CHARITY    * 100)
const prizePct   = Math.round(REVENUE_SPLIT.PRIZE_POOL * 100)

function fadeUp(delay = 0) {
  return {
    initial:     { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport:    { once: true, margin: '-60px' },
    transition:  { delay, type: 'spring', stiffness: 240, damping: 24 },
  }
}

function SectionLabel({ children }) {
  return (
    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">{children}</span>
  )
}

function FAQItem({ q, a }) {
  return (
    <motion.div {...fadeUp()} className="border-b border-gray-800 pb-6">
      <h3 className="text-base font-bold text-white mb-2">{q}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{a}</p>
    </motion.div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HowItWorksContent() {
  const tiers = Object.values(SUBSCRIPTION_TIERS)

  return (
    <div className="bg-gray-950 text-white">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="pt-24 md:pt-32 pb-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionLabel>Complete guide</SectionLabel>
          </motion.div>
          <motion.h1 {...fadeUp(0.08)} className="text-3xl sm:text-4xl md:text-5xl font-black mt-3 mb-5 leading-tight">
            Golf that gives back —{' '}
            <span className="text-amber-400">here's exactly how</span>
          </motion.h1>
          <motion.p {...fadeUp(0.14)} className="text-base md:text-lg text-gray-400 leading-relaxed">
            GolfGives turns your monthly subscription into charity donations, prize draw entries, and a community of golfers who care about more than handicaps.
          </motion.p>
        </div>
      </section>

      {/* ── STEP 1: Subscribe ─────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 border-t border-gray-800/40">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <motion.div {...fadeUp()}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-5xl font-black text-amber-400/20">01</span>
                <SectionLabel>Step One</SectionLabel>
              </div>
              <h2 className="text-2xl md:text-3xl font-black mb-4 text-white">Subscribe</h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                Choose a plan below. Your subscription is split every month:{' '}
                <strong className="text-amber-400">{charityPct}% to charity</strong>,{' '}
                <strong className="text-white">{prizePct}% into the prize pool</strong>,
                and 20% keeps the platform running.
              </p>
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-3 mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Revenue split per subscription</p>
                {[
                  { label: 'Charity Donation',  pct: charityPct, color: 'bg-rose-500' },
                  { label: 'Prize Pool',         pct: prizePct,   color: 'bg-amber-400' },
                  { label: 'Platform Operation', pct: 20,         color: 'bg-gray-600' },
                ].map(({ label, pct, color }) => (
                  <div key={label} className="flex items-center gap-3 mb-2 last:mb-0">
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-36 flex-shrink-0">{label} ({pct}%)</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Plan cards */}
            <motion.div {...fadeUp(0.1)} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
              {tiers.map((tier) => (
                <div key={tier.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white capitalize">{tier.name}</span>
                    <span className="text-lg font-black text-amber-400">
                      ₹{(tier.priceMonthly * 100).toFixed(0)}
                      <span className="text-xs text-gray-500 font-normal">/mo</span>
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {tier.features.slice(0, 3).map((f) => (
                      <li key={f} className="text-xs text-gray-400 flex items-start gap-1.5">
                        <span className="text-amber-400 mt-0.5">✓</span>{f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <Link
                href={ROUTES.PRICING}
                className="text-center text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors py-2"
              >
                Compare all plans →
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STEP 2: Score Entry ───────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 bg-gray-900/30 border-t border-gray-800/40">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Score mockup */}
            <motion.div {...fadeUp(0.06)} className="order-2 lg:order-1">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Score Entry — Stableford</p>
                {[
                  { hole: 1, par: 4, strokes: 5, points: 1 },
                  { hole: 2, par: 3, strokes: 3, points: 2 },
                  { hole: 3, par: 5, strokes: 5, points: 3 },
                  { hole: 4, par: 4, strokes: 4, points: 2 },
                ].map((row) => (
                  <div key={row.hole} className="flex items-center justify-between text-sm bg-gray-800/40 rounded-xl px-4 py-2.5">
                    <span className="text-gray-500">Hole {row.hole}</span>
                    <span className="text-gray-400">Par {row.par}</span>
                    <span className="text-gray-300">{row.strokes} strokes</span>
                    <span className="font-black text-amber-400">{row.points} pts</span>
                  </div>
                ))}
                <div className="border-t border-gray-800 pt-3 flex justify-between">
                  <span className="text-xs text-gray-500">Total Stableford Points</span>
                  <span className="text-sm font-black text-white">38 pts</span>
                </div>
                <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-2.5">
                  <p className="text-xs text-amber-400 font-semibold">Your 5-score rolling average: <strong>36.4 pts</strong></p>
                  <p className="text-xs text-gray-500 mt-0.5">Draw entry ticket: 3-6-14-22-36</p>
                </div>
              </div>
            </motion.div>

            <motion.div {...fadeUp()} className="order-1 lg:order-2">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-5xl font-black text-rose-400/20">02</span>
                <SectionLabel>Step Two</SectionLabel>
              </div>
              <h2 className="text-2xl md:text-3xl font-black mb-4 text-white">Enter Your Scores</h2>
              <div className="space-y-4 text-sm text-gray-400">
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <h4 className="font-bold text-white mb-1.5">Stableford Scoring</h4>
                  <p className="leading-relaxed">
                    Each hole is worth points based on how you perform relative to par. Bogey = 1 point, Par = 2 points, Birdie = 3 points, Eagle = 4 points. Log your total after each round.
                  </p>
                </div>
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <h4 className="font-bold text-white mb-1.5">Rolling 5-Score System</h4>
                  <p className="leading-relaxed">
                    Your last 5 scores are averaged to create your draw entry. This number (1–36+) is converted into draw ticket numbers — meaning consistent golfers get more relevant tickets.
                  </p>
                </div>
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <h4 className="font-bold text-white mb-1.5">No minimum rounds required</h4>
                  <p className="leading-relaxed">
                    Don't worry if you haven't played all month — you're still entered in the draw. Log whatever rounds you do play.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STEP 3: Draw System ───────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 border-t border-gray-800/40">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <motion.div {...fadeUp()}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-5xl font-black text-emerald-400/20">03</span>
                <SectionLabel>Step Three</SectionLabel>
              </div>
              <h2 className="text-2xl md:text-3xl font-black mb-4 text-white">Win & Give</h2>
              <div className="space-y-4 text-sm text-gray-400">
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <h4 className="font-bold text-white mb-1.5">Monthly Draw on the {DRAW_DAY_OF_MONTH}th</h4>
                  <p className="leading-relaxed">
                    Five numbers are drawn from 1–36 on the {DRAW_DAY_OF_MONTH}th of every month. Your ticket numbers (based on your rolling scores) are compared to the drawn numbers.
                  </p>
                </div>
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <h4 className="font-bold text-white mb-1.5">Three Prize Tiers</h4>
                  <ul className="space-y-2 mt-2">
                    {[
                      { match: '5 numbers', label: 'Jackpot',    pct: '60% of prize pool', color: 'text-amber-400' },
                      { match: '4 numbers', label: 'Runner Up',  pct: '30% of prize pool', color: 'text-gray-300'  },
                      { match: '3 numbers', label: 'Bronze',     pct: '10% of prize pool', color: 'text-amber-700' },
                    ].map(({ match, label, pct, color }) => (
                      <li key={match} className="flex items-center justify-between bg-gray-800/40 rounded-lg px-3 py-2">
                        <span>Match <strong className="text-white">{match}</strong></span>
                        <span className="flex items-center gap-2">
                          <span className={`font-bold text-xs ${color}`}>{label}</span>
                          <span className="text-gray-500">{pct}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <h4 className="font-bold text-white mb-1.5">Jackpot Rollover</h4>
                  <p className="leading-relaxed">
                    If no one matches all 5 numbers in a month, the jackpot rolls over into the following month's prize pool — making it even bigger.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div {...fadeUp(0.1)}>
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                <h4 className="text-sm font-bold text-white mb-4">Prize pool calculation</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-gray-800 pb-3">
                    <span className="text-gray-400">500 active subscribers × ₹999</span>
                    <span className="text-white font-semibold">₹4,99,500</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-800 pb-3">
                    <span className="text-gray-400">40% to prize pool</span>
                    <span className="text-amber-400 font-semibold">₹1,99,800</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-800 pb-3">
                    <span className="text-gray-400">40% to charity</span>
                    <span className="text-rose-400 font-semibold">₹1,99,800</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-500">Jackpot (60% of pool)</span>
                    <span className="text-amber-300 font-black">₹1,19,880</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-4">Example based on 500 subscribers at ₹999/month.</p>
              </div>

              <div className="mt-6 bg-rose-950/30 border border-rose-900/40 rounded-2xl p-6">
                <h4 className="text-sm font-bold text-white mb-3">Charity Contribution</h4>
                <div className="space-y-3 text-sm text-gray-400">
                  <p className="leading-relaxed">Members vote each quarter on which charities to support. All partner charities are verified registered organisations.</p>
                  <p className="leading-relaxed">You can also nominate a specific charity to support independently through your settings — in addition to the shared pool donation.</p>
                  <p className="text-xs text-gray-500">Minimum 10% of total revenue is guaranteed to charities regardless of subscription numbers.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 bg-gray-900/30 border-t border-gray-800/40">
        <div className="max-w-2xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-12">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="text-2xl md:text-3xl font-black mt-2 text-white">Common questions</h2>
          </motion.div>
          <div className="space-y-6">
            <FAQItem
              q="Do I have to be a good golfer to join?"
              a="Not at all. GolfGives welcomes golfers of all abilities. Your Stableford score system means casual and competitive golfers have fair draw entries. The charity contribution happens regardless of how many rounds you play."
            />
            <FAQItem
              q="What happens if no one wins the jackpot?"
              a="The jackpot rolls over into the following month's prize pool. This means it grows until someone matches all 5 numbers. Rollover amounts are clearly shown on the draw page."
            />
            <FAQItem
              q="How are charities verified?"
              a="All charities on GolfGives are registered organisations verified by our team before being listed. Members can vote on which charities to feature each quarter."
            />
            <FAQItem
              q="When and how are prizes paid?"
              a={`Winners are notified by email within 24 hours of the draw on the ${DRAW_DAY_OF_MONTH}th. You'll be asked to submit bank details through your dashboard. Payments are processed within 5 business days after verification.`}
            />
            <FAQItem
              q="Can I cancel my subscription?"
              a="Yes — cancel any time from your Dashboard → Subscription → Manage Billing. You keep full access until the end of your current billing period. No prorated refunds."
            />
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 border-t border-gray-800/40">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div {...fadeUp()}>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-4">Ready to play with purpose?</h2>
            <p className="text-gray-400 text-sm md:text-base mb-8">
              Start from ₹999/month. Your first draw entry is included.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={ROUTES.SIGNUP}
                className="px-8 py-4 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black text-base rounded-2xl transition-all hover:scale-105 min-h-[52px] flex items-center justify-center"
              >
                Get Started →
              </Link>
              <Link
                href={ROUTES.PRICING}
                className="px-8 py-4 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-semibold text-base rounded-2xl transition-colors min-h-[52px] flex items-center justify-center"
              >
                View Plans
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
