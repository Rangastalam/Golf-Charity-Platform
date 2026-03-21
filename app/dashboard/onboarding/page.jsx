/**
 * @fileoverview Onboarding flow for new members — client component.
 *
 * 4-step wizard:
 *   1. Welcome & account confirmed
 *   2. Choose a subscription plan
 *   3. Select a charity + contribution percentage
 *   4. Log your first score
 *
 * New users are redirected here from the post-signup flow.
 * Existing users who visit can always skip to the dashboard.
 */

'use client'

import { useState }           from 'react'
import { useRouter }          from 'next/navigation'
import Link                   from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ROUTES, PLANS }      from '@/constants'

// ─── Step indicators ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Welcome'      },
  { id: 2, label: 'Subscribe'    },
  { id: 3, label: 'Charity'      },
  { id: 4, label: 'First Score'  },
]

/**
 * @param {{ current: number, total: number }} props
 */
function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${current} of ${total}`}>
      {STEPS.map((step) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className={[
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors',
              step.id === current
                ? 'bg-green-800 text-white'
                : step.id < current
                  ? 'bg-green-200 text-green-800'
                  : 'bg-gray-100 text-gray-400',
            ].join(' ')}
          >
            {step.id < current ? '✓' : step.id}
          </div>
          {step.id < total && (
            <div
              className={[
                'h-0.5 w-8 rounded-full transition-colors',
                step.id < current ? 'bg-green-300' : 'bg-gray-100',
              ].join(' ')}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1: Welcome ─────────────────────────────────────────────────────────

function StepWelcome({ onNext }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-6 text-center"
    >
      <div className="text-5xl">⛳</div>
      <div>
        <h1 className="text-2xl font-black text-gray-900">Welcome to GolfGives!</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
          You're all set. Let's get your account ready in 3 quick steps — it'll take
          less than 2 minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        {[
          { icon: '🎟️', title: 'Enter Monthly Draws', desc: 'Win cash prizes every month' },
          { icon: '❤️', title: 'Support a Charity',   desc: 'Give back with every subscription' },
          { icon: '📊', title: 'Track Your Golf',      desc: 'Log scores & monitor progress' },
        ].map(({ icon, title, desc }) => (
          <div
            key={title}
            className="bg-gray-50 rounded-2xl p-4 flex items-start gap-3"
          >
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-sm font-bold text-gray-900">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-green-800 text-white text-sm font-bold px-8 py-3.5 rounded-xl hover:bg-green-900 transition-colors"
      >
        Get Started →
      </button>
    </motion.div>
  )
}

// ─── Step 2: Subscribe ────────────────────────────────────────────────────────

function StepSubscribe({ onNext, onSkip }) {
  const [selectedPlan, setSelectedPlan] = useState('monthly')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)

  async function handleCheckout() {
    setLoading(true)
    setError(null)

    try {
      const res  = await fetch('/api/subscriptions/create-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan: selectedPlan }),
      })
      const json = await res.json()

      if (!res.ok || !json.url) {
        setError(json.error ?? 'Could not start checkout. Please try again.')
        return
      }

      window.location.href = json.url
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-black text-gray-900">Choose a Plan</h2>
        <p className="text-sm text-gray-500 mt-1">
          Your subscription funds the prize pool and charity donations.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.values(PLANS).map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={[
              'text-left border-2 rounded-2xl p-5 transition-all',
              selectedPlan === plan.id
                ? 'border-green-700 bg-green-50'
                : 'border-gray-100 hover:border-gray-300',
            ].join(' ')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-900">{plan.name}</span>
              {plan.badge && (
                <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                  {plan.badge}
                </span>
              )}
            </div>
            <p className="text-2xl font-black text-green-800">{plan.priceDisplay}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              per {plan.billingInterval}
              {plan.savingsPercent ? ` · save ${plan.savingsPercent}%` : ''}
            </p>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="flex-1 bg-green-800 text-white text-sm font-bold py-3.5 rounded-xl hover:bg-green-900 transition-colors disabled:opacity-50"
        >
          {loading ? 'Redirecting…' : `Subscribe (${PLANS[selectedPlan]?.priceDisplay})`}
        </button>
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
        >
          Skip for now
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Secure checkout via Stripe. Cancel anytime.
      </p>
    </motion.div>
  )
}

// ─── Step 3: Charity ──────────────────────────────────────────────────────────

function StepCharity({ onNext, onSkip }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-black text-gray-900">Choose Your Charity</h2>
        <p className="text-sm text-gray-500 mt-1">
          A percentage of your subscription goes directly to the charity you choose.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
        <p className="text-sm text-green-800 font-semibold">
          🌟 You can always change your charity from the dashboard.
        </p>
        <p className="text-xs text-green-600 mt-1">
          Head to <strong>My Charity</strong> in the sidebar to browse all supported charities
          and set your contribution percentage (10%–100%).
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`${ROUTES.DASHBOARD}/charity`}
          className="flex-1 text-center bg-green-800 text-white text-sm font-bold py-3.5 rounded-xl hover:bg-green-900 transition-colors"
        >
          Choose a Charity Now →
        </Link>
        <button
          onClick={onNext}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
        >
          I'll do this later
        </button>
      </div>
    </motion.div>
  )
}

// ─── Step 4: First Score ──────────────────────────────────────────────────────

function StepFirstScore({ onFinish }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-6 text-center"
    >
      <div className="text-5xl">🏌️</div>
      <div>
        <h2 className="text-xl font-black text-gray-900">Log Your First Score</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
          Log at least 3 rounds to be eligible for the monthly draw. Your scores are
          your lottery numbers!
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-left">
        <p className="text-sm font-semibold text-amber-800">How scoring works:</p>
        <ul className="mt-2 space-y-1.5 text-xs text-amber-700">
          <li>• Log your Stableford score after each round (1–45)</li>
          <li>• Your top 5 scores become your draw numbers</li>
          <li>• Match the drawn numbers to win prizes</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href={`${ROUTES.DASHBOARD}/scores`}
          className="inline-flex items-center justify-center gap-2 bg-green-800 text-white text-sm font-bold px-8 py-3.5 rounded-xl hover:bg-green-900 transition-colors"
        >
          Log a Score →
        </Link>
        <button
          onClick={onFinish}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
        >
          Go to Dashboard
        </button>
      </div>
    </motion.div>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [step,   setStep]   = useState(1)
  const router              = useRouter()

  function goTo(n) {
    setStep(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function finish() {
    router.push(ROUTES.DASHBOARD)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-8">
        {/* Step indicator */}
        <div className="flex items-center justify-between">
          <StepIndicator current={step} total={STEPS.length} />
          <button
            onClick={finish}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip all
          </button>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <StepWelcome key="welcome" onNext={() => goTo(2)} />
          )}
          {step === 2 && (
            <StepSubscribe key="subscribe" onNext={() => goTo(3)} onSkip={() => goTo(3)} />
          )}
          {step === 3 && (
            <StepCharity key="charity" onNext={() => goTo(4)} onSkip={() => goTo(4)} />
          )}
          {step === 4 && (
            <StepFirstScore key="score" onFinish={finish} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
