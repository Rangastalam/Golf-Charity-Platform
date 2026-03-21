'use client'

/**
 * @fileoverview Interactive pricing cards with monthly/yearly toggle.
 * Dark theme, amber accent, Framer Motion animations.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PLANS, REVENUE_SPLIT, ROUTES } from '@/constants'

const charityPct = Math.round(REVENUE_SPLIT.CHARITY    * 100)
const prizePct   = Math.round(REVENUE_SPLIT.PRIZE_POOL * 100)

const PLAN_FEATURES = [
  `${charityPct}% of your subscription to charity`,
  'Monthly prize draw entries',
  'Score tracking & handicap history',
  'Charity leaderboard access',
  'Draw result notifications',
  'Community forum',
]

const YEARLY_EXTRA = [
  'Priority charity voting',
  'Annual gala invitation',
  'Early draw results',
]

/**
 * @param {{ plan: object, isLoggedIn: boolean, isHighlighted: boolean }} props
 */
function PricingCard({ plan, isLoggedIn, isHighlighted }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const router = useRouter()

  const isYearly   = plan.id === 'yearly'
  const features   = isYearly ? [...PLAN_FEATURES, ...YEARLY_EXTRA] : PLAN_FEATURES
  const monthlyEq  = isYearly ? `≈ ₹${Math.round(plan.priceCents / 12).toLocaleString('en-IN')}/mo` : null

  async function handleSubscribe() {
    if (!isLoggedIn) { router.push(ROUTES.SIGNUP); return }
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/subscriptions/create-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan: plan.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong. Please try again.'); return }
      if (!data.url) { setError('No checkout URL returned. Please try again.'); return }
      window.location.href = data.url
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
      className={[
        'relative flex flex-col rounded-3xl border p-7 md:p-8',
        isHighlighted
          ? 'bg-gradient-to-br from-amber-950/60 to-gray-900 border-amber-500/60 shadow-amber-900/30 shadow-xl'
          : 'bg-gray-900/60 border-gray-700/60',
      ].join(' ')}
    >
      {/* Best value badge */}
      {plan.badge && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-gray-950 text-xs font-black px-4 py-1 rounded-full uppercase tracking-wide whitespace-nowrap">
          {plan.badge}
        </span>
      )}

      {/* Plan name */}
      <div className="mb-5">
        <h3 className={`text-sm font-bold uppercase tracking-widest mb-3 ${isHighlighted ? 'text-amber-400' : 'text-gray-400'}`}>
          {plan.name}
        </h3>

        {/* Price */}
        <div className="flex items-end gap-1 flex-wrap">
          <span className="text-4xl md:text-5xl font-black text-white leading-none">
            {plan.priceDisplay}
          </span>
          <span className="text-gray-500 text-sm mb-1">/{plan.billingInterval}</span>
        </div>

        {monthlyEq && (
          <p className="text-sm text-amber-400 mt-1.5 font-semibold">
            {monthlyEq} · Save {plan.savingsPercent}%
          </p>
        )}
      </div>

      {/* Charity + prize callout */}
      <div className="bg-gray-800/50 rounded-2xl p-4 mb-6 space-y-2.5">
        <div className="flex items-center gap-2.5 text-sm">
          <span className="text-xl">🎗️</span>
          <span className="text-gray-300">
            <strong className="text-rose-400">{charityPct}%</strong> goes to charity every month
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <span className="text-xl">🏆</span>
          <span className="text-gray-300">
            <strong className="text-amber-400">{prizePct}%</strong> builds the prize pool
          </span>
        </div>
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-3 mb-7">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-300">
            <span className={`flex-shrink-0 mt-0.5 ${isHighlighted ? 'text-amber-400' : 'text-gray-500'}`}>✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {error && (
        <p className="mb-4 rounded-xl bg-red-900/40 border border-red-800 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* CTA */}
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className={[
          'w-full py-4 rounded-2xl text-sm font-black transition-all duration-200 min-h-[52px]',
          isHighlighted
            ? 'bg-amber-400 hover:bg-amber-300 text-gray-950 shadow-amber-400/20 shadow-lg hover:scale-[1.02]'
            : 'bg-gray-800 hover:bg-gray-700 text-white',
          loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Redirecting…
          </span>
        ) : isLoggedIn ? 'Subscribe Now' : 'Get Started'}
      </button>

      {!isLoggedIn && (
        <p className="mt-3 text-center text-xs text-gray-600">
          Free account required —{' '}
          <a href={ROUTES.LOGIN} className="text-amber-400 hover:text-amber-300 transition-colors">
            already have one?
          </a>
        </p>
      )}
    </motion.div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function BillingToggle({ yearly, onChange }) {
  return (
    <div className="flex items-center justify-center gap-4 mb-10">
      <span className={`text-sm font-semibold transition-colors ${!yearly ? 'text-white' : 'text-gray-500'}`}>
        Monthly
      </span>
      <button
        onClick={() => onChange(!yearly)}
        className={[
          'relative w-14 h-7 rounded-full transition-colors duration-200',
          yearly ? 'bg-amber-400' : 'bg-gray-700',
        ].join(' ')}
        aria-label="Toggle billing period"
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow"
          style={{ left: yearly ? 'calc(100% - 1.75rem)' : '2px' }}
        />
      </button>
      <span className={`text-sm font-semibold transition-colors ${yearly ? 'text-white' : 'text-gray-500'}`}>
        Yearly
        {yearly && (
          <span className="ml-1.5 text-xs font-black text-amber-400">Save 17%</span>
        )}
      </span>
    </div>
  )
}

// ─── Container ────────────────────────────────────────────────────────────────

/**
 * @param {{ isLoggedIn: boolean }} props
 */
export default function PricingCards({ isLoggedIn }) {
  const [yearly, setYearly] = useState(false)
  const plans = Object.values(PLANS)

  // Show only the relevant plan based on toggle
  const visiblePlan = yearly ? PLANS.yearly : PLANS.monthly
  const otherPlan   = yearly ? PLANS.monthly : PLANS.yearly

  return (
    <div className="max-w-4xl mx-auto">
      <BillingToggle yearly={yearly} onChange={setYearly} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          <PricingCard
            key={`primary-${visiblePlan.id}`}
            plan={visiblePlan}
            isLoggedIn={isLoggedIn}
            isHighlighted={yearly}
          />
        </AnimatePresence>
        {/* Always show the other plan dimmed */}
        <div className="opacity-60">
          <PricingCard
            key={`other-${otherPlan.id}`}
            plan={otherPlan}
            isLoggedIn={isLoggedIn}
            isHighlighted={false}
          />
        </div>
      </div>

      <p className="text-center text-xs text-gray-600 mt-6">
        All prices in Indian Rupees (₹). Stripe processes all payments securely.
      </p>
    </div>
  )
}
