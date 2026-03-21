/**
 * @fileoverview Dashboard component showing the user's winning history.
 *
 * - Total amount won (paid wins only)
 * - List of individual wins with draw month, match type, prize, and status badge
 * - Payment status badges: pending (yellow), verified (blue), paid (green)
 * - "Upload proof" button for eligible pending wins
 * - WinnerVerification modal for proof submission
 * - Framer Motion stagger on list items
 *
 * Mobile: each win is a card with prize amount prominent
 * Desktop (md+): same card layout with more horizontal spacing
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import WinnerVerification from './WinnerVerification'
import {
  formatMatchType,
  deriveDisplayStatus,
  formatPaymentStatus,
  getStatusColors,
  getStatusDotColor,
  calculateTotalWinnings,
  isEligibleToUploadProof,
} from '@/lib/winnerHelpers'

export default function WinningsOverview() {
  const [winners,      setWinners]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [activeProof,  setActiveProof]  = useState(null) // winner id for proof modal

  useEffect(() => {
    let cancelled = false
    fetch('/api/winners')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setWinners(data.winners ?? [])
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load winnings. Please refresh.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Prevent body scroll when modal open on mobile
  useEffect(() => {
    if (activeProof) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [activeProof])

  function handleProofSubmitted(updated) {
    setWinners((prev) =>
      prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w))
    )
    setActiveProof(null)
  }

  const totalPaid = calculateTotalWinnings(winners)

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-20 bg-gray-100 rounded-2xl" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 md:h-16 bg-gray-100 rounded-xl" />
        ))}
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (winners.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 md:py-12 text-center"
      >
        <p className="text-4xl mb-3" aria-hidden="true">🎯</p>
        <p className="font-semibold text-gray-700">No wins yet</p>
        <p className="text-xs md:text-sm text-gray-500 mt-1 max-w-xs mx-auto">
          Enter the monthly draw and match enough of your Stableford scores to
          the drawn numbers to win a prize.
        </p>
      </motion.div>
    )
  }

  // ── Stagger variants ───────────────────────────────────────────────────────
  const list = {
    hidden: {},
    show:   { transition: { staggerChildren: 0.06 } },
  }
  const item = {
    hidden: { opacity: 0, x: -12 },
    show:   { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } },
  }

  return (
    <div className="space-y-4 md:space-y-5">
      {/* ── Total won banner ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-green-950 rounded-2xl p-4 md:p-5 text-white flex items-center justify-between gap-4"
      >
        <div>
          <p className="text-xs font-semibold text-green-400 uppercase tracking-wider">
            Total prizes paid
          </p>
          {/* Prize amount is prominent on mobile */}
          <p className="text-2xl md:text-3xl font-black mt-0.5">
            ₹{totalPaid.toLocaleString()}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-green-400">{winners.length} win{winners.length !== 1 ? 's' : ''}</p>
          <p className="text-xs text-green-500 mt-0.5">all time</p>
        </div>
      </motion.div>

      {/* ── Wins list — card layout works on both mobile and desktop ─────── */}
      <motion.ul
        variants={list}
        initial="hidden"
        animate="show"
        className="space-y-3"
        role="list"
      >
        {winners.map((winner) => {
          const displayStatus = deriveDisplayStatus(winner.payment_status, winner.verified_at)
          const { bg, text }  = getStatusColors(displayStatus)
          const dotColor      = getStatusDotColor(displayStatus)
          const canUpload     = isEligibleToUploadProof(winner)

          const drawMonth = winner.draws?.month
            ? new Date(winner.draws.month + '-01').toLocaleString('en-US', {
                month: 'long',
                year:  'numeric',
              })
            : '—'

          return (
            <motion.li
              key={winner.id}
              variants={item}
              className="bg-white rounded-xl border border-gray-100 px-4 md:px-5 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left — draw details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-xs md:text-sm">
                      {formatMatchType(winner.match_type)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${bg} ${text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
                      {formatPaymentStatus(displayStatus)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{drawMonth}</p>

                  {/* Upload proof nudge */}
                  {canUpload && (
                    <button
                      onClick={() => setActiveProof(winner.id)}
                      className="mt-2 text-xs font-semibold text-green-700 hover:text-green-900 underline underline-offset-2 transition-colors min-h-[36px] flex items-center"
                    >
                      Upload proof to claim →
                    </button>
                  )}

                  {/* Proof submitted, awaiting review */}
                  {winner.proof_url && !winner.verified_at && (
                    <p className="mt-1.5 text-xs text-blue-600 font-medium">
                      ✓ Proof submitted — awaiting admin review
                    </p>
                  )}
                </div>

                {/* Right — prize amount (prominent on mobile too) */}
                <div className="text-right shrink-0">
                  <p className="text-lg md:text-xl font-black text-gray-900">
                    ₹{Number(winner.prize_amount).toLocaleString()}
                  </p>
                  {winner.paid_at && (
                    <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">
                      Paid{' '}
                      {new Date(winner.paid_at).toLocaleDateString('en-GB', {
                        day:   'numeric',
                        month: 'short',
                      })}
                    </p>
                  )}
                </div>
              </div>
            </motion.li>
          )
        })}
      </motion.ul>

      {/* ── Proof upload modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeProof && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveProof(null)}
              className="fixed inset-0 bg-black/50 z-40"
              aria-hidden="true"
            />

            {/* Modal panel — bottom sheet on mobile, centred on sm+ */}
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1     }}
              exit={{   opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md z-50 rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[92vh] sm:max-h-[85vh] overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-label="Submit win proof"
            >
              {/* Close button */}
              <div className="relative">
                <button
                  onClick={() => setActiveProof(null)}
                  className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <WinnerVerification
                  winner={winners.find((w) => w.id === activeProof)}
                  onProofSubmitted={handleProofSubmitted}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
