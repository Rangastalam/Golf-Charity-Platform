'use client'

/**
 * @fileoverview SubscriptionSuccessBanner
 *
 * Shown on the dashboard when the URL contains ?subscription=success
 * (the redirect target after a completed Stripe Checkout).
 *
 * On mount it immediately calls POST /api/subscriptions/sync to pull the
 * live subscription state from Stripe and write it to the database, so
 * subscription-gated features (score submission, draw entries) work right
 * away without waiting for the webhook.
 *
 * Once sync completes the query-param is stripped from the URL so a page
 * refresh doesn't trigger another sync.
 */

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

/** @typedef {'idle'|'syncing'|'success'|'error'} SyncState */

export default function SubscriptionSuccessBanner() {
  const searchParams  = useSearchParams()
  const router        = useRouter()

  /** @type {[SyncState, Function]} */
  const [syncState, setSyncState] = useState('idle')
  const [retries,   setRetries]   = useState(0)

  const isCheckoutSuccess = searchParams.get('subscription') === 'success'

  useEffect(() => {
    if (!isCheckoutSuccess) return

    let cancelled = false

    async function sync() {
      setSyncState('syncing')

      try {
        const res  = await fetch('/api/subscriptions/sync', { method: 'POST' })
        const data = await res.json()

        if (cancelled) return

        if (!res.ok) {
          throw new Error(data.error ?? 'Sync failed')
        }

        if (data.subscribed) {
          setSyncState('success')
          // Strip the query param so a refresh doesn't re-trigger
          const url = new URL(window.location.href)
          url.searchParams.delete('subscription')
          router.replace(url.pathname + url.search, { scroll: false })
        } else if (retries < 4) {
          // Subscription not active yet — Stripe may still be processing.
          // Retry with exponential back-off (1 s, 2 s, 4 s, 8 s).
          const delay = Math.pow(2, retries) * 1000
          setTimeout(() => {
            if (!cancelled) setRetries((r) => r + 1)
          }, delay)
        } else {
          // Gave up — subscription may take a moment longer via webhook
          setSyncState('error')
        }
      } catch (err) {
        if (!cancelled) {
          console.error('SubscriptionSuccessBanner sync error:', err)
          setSyncState('error')
        }
      }
    }

    sync()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckoutSuccess, retries])

  if (!isCheckoutSuccess && syncState === 'idle') return null

  return (
    <AnimatePresence>
      {(syncState === 'syncing' || syncState === 'success' || syncState === 'error') && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35 }}
          className={[
            'rounded-xl border px-5 py-4 flex items-start gap-4 mb-6',
            syncState === 'success'
              ? 'bg-green-50 border-green-300'
              : syncState === 'error'
              ? 'bg-amber-50 border-amber-300'
              : 'bg-blue-50 border-blue-300',
          ].join(' ')}
          role="status"
          aria-live="polite"
        >
          {/* Icon */}
          <span className="text-2xl shrink-0" aria-hidden="true">
            {syncState === 'success' ? '🎉' : syncState === 'error' ? '⏳' : '⚙️'}
          </span>

          <div className="min-w-0">
            {syncState === 'syncing' && (
              <>
                <p className="font-semibold text-blue-900 text-sm">
                  Setting up your subscription…
                </p>
                <p className="text-blue-700 text-xs mt-0.5">
                  This only takes a moment. Subscription-gated features will
                  unlock automatically.
                </p>
              </>
            )}

            {syncState === 'success' && (
              <>
                <p className="font-semibold text-green-900 text-sm">
                  Subscription active — welcome to GolfGives!
                </p>
                <p className="text-green-700 text-xs mt-0.5">
                  You can now submit scores and enter the monthly prize draw.
                </p>
              </>
            )}

            {syncState === 'error' && (
              <>
                <p className="font-semibold text-amber-900 text-sm">
                  Your subscription is being processed
                </p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Payment confirmed. Your account will activate within a
                  minute — refresh the page if features are still locked.
                </p>
              </>
            )}
          </div>

          {/* Spinner for syncing state */}
          {syncState === 'syncing' && (
            <svg
              className="h-5 w-5 animate-spin text-blue-500 shrink-0 ml-auto"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
