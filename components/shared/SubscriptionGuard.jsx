'use client'

/**
 * @fileoverview SubscriptionGuard — wraps dashboard features that require an
 * active subscription.
 *
 * Behaviour:
 *  - While loading: renders a skeleton placeholder
 *  - No active subscription: renders an upgrade prompt linking to /pricing
 *  - Active but expiring in ≤ 7 days: renders children + an expiry warning banner
 *  - Active and healthy: renders children as-is
 *
 * Usage:
 *   <SubscriptionGuard>
 *     <ProtectedFeature />
 *   </SubscriptionGuard>
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@/constants'

/** Days remaining threshold that triggers the expiry warning */
const EXPIRY_WARNING_DAYS = 7

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonBlock() {
  return (
    <div className="animate-pulse rounded-xl bg-gray-100 h-48 w-full" aria-busy="true" />
  )
}

// ─── Upgrade prompt ───────────────────────────────────────────────────────────

/**
 * @param {{ status: string | undefined }} props
 */
function UpgradePrompt({ status }) {
  const isLapsed = status === 'lapsed'

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
      <div className="text-4xl mb-4" role="img" aria-label="locked">
        🔒
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">
        {isLapsed ? 'Your subscription has lapsed' : 'Subscription required'}
      </h3>
      <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
        {isLapsed
          ? 'Your last payment was unsuccessful. Update your billing details to restore full access.'
          : 'This feature is available to GolfGives subscribers. Join to access prize draws, score tracking, and charity voting.'}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {isLapsed ? (
          <ManageBillingButton />
        ) : (
          <Link
            href={ROUTES.PRICING}
            className="inline-block rounded-full bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 text-sm transition-colors"
          >
            View plans →
          </Link>
        )}
      </div>
    </div>
  )
}

// ─── Manage billing button (client action) ────────────────────────────────────

function ManageBillingButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleManage() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/subscriptions/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Failed to open billing portal')
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleManage}
        disabled={loading}
        className="rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 text-sm transition-colors cursor-pointer"
      >
        {loading ? 'Opening portal…' : 'Update billing details'}
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}

// ─── Expiry warning banner ────────────────────────────────────────────────────

/**
 * @param {{ daysRemaining: number, cancelAtPeriodEnd: boolean }} props
 */
function ExpiryWarning({ daysRemaining, cancelAtPeriodEnd }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handlePortal() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/subscriptions/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Failed to open billing portal')
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const label =
    daysRemaining === 0
      ? 'today'
      : daysRemaining === 1
      ? 'tomorrow'
      : `in ${daysRemaining} days`

  return (
    <div
      role="alert"
      className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl" role="img" aria-label="warning">
          ⚠️
        </span>
        <div>
          <p className="text-sm font-semibold text-amber-900">
            {cancelAtPeriodEnd
              ? `Subscription cancels ${label}`
              : `Subscription renews ${label}`}
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            {cancelAtPeriodEnd
              ? 'Your access will end when the current period expires.'
              : 'Update your payment details if you need to make changes.'}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-start gap-1 shrink-0">
        <button
          onClick={handlePortal}
          disabled={loading}
          className="rounded-full border border-amber-600 bg-transparent hover:bg-amber-100 disabled:opacity-50 text-amber-800 text-xs font-semibold px-4 py-1.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          {loading ? 'Opening…' : 'Manage subscription'}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @typedef {Object} SubscriptionStatus
 * @property {boolean} subscribed
 * @property {string} [status]
 * @property {string} [plan]
 * @property {string} [current_period_end]
 * @property {string|null} [cancelled_at]
 * @property {number|null} [days_remaining]
 */

/**
 * Wraps children with a subscription check. Children are only rendered when
 * the current user has an active subscription.
 *
 * @param {{ children: React.ReactNode }} props
 */
export default function SubscriptionGuard({ children }) {
  /** @type {[SubscriptionStatus | null, Function]} */
  const [subscriptionStatus, setSubscriptionStatus] = useState(null)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch('/api/subscriptions/status')
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setSubscriptionStatus(data)
      })
      .catch((err) => {
        console.error('SubscriptionGuard: failed to fetch status', err)
        if (!cancelled) setFetchError(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // ── Loading state ─────────────────────────────────────────────────────────
  if (subscriptionStatus === null && !fetchError) {
    return <SkeletonBlock />
  }

  // ── Fetch error — fail open so a network blip doesn't lock users out ──────
  if (fetchError) {
    return <>{children}</>
  }

  // ── Not subscribed ────────────────────────────────────────────────────────
  if (!subscriptionStatus.subscribed) {
    return <UpgradePrompt status={subscriptionStatus.status} />
  }

  // ── Active subscription ───────────────────────────────────────────────────
  const daysRemaining = subscriptionStatus.days_remaining ?? null
  const showWarning =
    daysRemaining !== null && daysRemaining <= EXPIRY_WARNING_DAYS

  return (
    <>
      {showWarning && (
        <ExpiryWarning
          daysRemaining={daysRemaining}
          cancelAtPeriodEnd={!!subscriptionStatus.cancelled_at}
        />
      )}
      {children}
    </>
  )
}
