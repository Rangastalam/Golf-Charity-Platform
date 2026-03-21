'use client'

/**
 * @fileoverview Dashboard score summary card.
 *
 * Displays a compact summary on the main dashboard:
 *  - Latest score
 *  - Average across all 5 slots
 *  - Trend (improving / declining / steady)
 *  - Progress bar showing how many of the 5 slots are filled
 *
 * Clicking the card opens a modal containing the full ScoreList and ScoreEntry.
 * Framer Motion entrance animation on mount.
 *
 * @param {{ scores: Array<{ id: string, score: number, played_at: string, created_at: string }> }} props
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ROUTES } from '@/constants'
import { getScoreAverage, getScoreTrend, formatScoreDate } from '@/lib/scoreHelpers'
import ScoreEntry from './ScoreEntry'
import ScoreList from './ScoreList'

const MAX_SCORES = 5

// ─── Trend icon ───────────────────────────────────────────────────────────────

/** @param {{ trend: string }} props */
function TrendIcon({ trend }) {
  if (trend === 'improving') {
    return (
      <span className="text-green-500 font-bold" aria-label="Improving">
        ↑
      </span>
    )
  }
  if (trend === 'declining') {
    return (
      <span className="text-red-500 font-bold" aria-label="Declining">
        ↓
      </span>
    )
  }
  return (
    <span className="text-gray-400 font-bold" aria-label="Steady">
      →
    </span>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

/** @param {{ initialScores: Array, onClose: () => void }} props */
function ScoreModal({ initialScores, onClose }) {
  const [scores, setScores] = useState(initialScores)
  const [fetching, setFetching] = useState(false)

  // Refresh from API when modal opens (initial data may be stale)
  useEffect(() => {
    setFetching(true)
    fetch('/api/scores')
      .then((r) => r.json())
      .then((data) => {
        if (data.scores) setScores(data.scores)
      })
      .catch(() => {/* keep initialScores on network error */})
      .finally(() => setFetching(false))
  }, [])

  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleScoreAdded(updatedScores) {
    setScores(updatedScores)
  }

  function handleScoresChange(updatedScores) {
    setScores(updatedScores)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Score manager"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-xl bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-2xl">
          <h2 className="text-base font-bold text-white">Your scores</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Score entry */}
          <ScoreEntry onScoreAdded={handleScoreAdded} />

          {/* Score list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">
                Recent rounds{' '}
                <span className="text-gray-500 font-normal">
                  ({fetching ? '…' : scores.length}/{MAX_SCORES})
                </span>
              </h3>
              <Link
                href={`${ROUTES.DASHBOARD}/scores`}
                onClick={onClose}
                className="text-xs text-green-400 hover:text-green-300"
              >
                Full page →
              </Link>
            </div>
            <ScoreList scores={scores} onScoresChange={handleScoresChange} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main card ────────────────────────────────────────────────────────────────

/** @param {{ scores: Array<{ id: string, score: number, played_at: string }> }} props */
export default function ScoreCard({ scores: initialScores }) {
  const [scores, setScores] = useState(initialScores ?? [])
  const [modalOpen, setModalOpen] = useState(false)

  const average = getScoreAverage(scores)
  const trend = getScoreTrend(scores)
  const latest = scores[0] ?? null
  const count = scores.length

  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        onClick={openModal}
        role="button"
        tabIndex={0}
        aria-label="Open score manager"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openModal() }}
        className="bg-white rounded-2xl border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-green-200 transition-all duration-200 select-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Scores
            </p>
            <p className="text-xs text-gray-500">
              {count}/{MAX_SCORES} rounds entered
            </p>
          </div>
          <span className="text-xs text-green-700 font-medium">
            Tap to manage →
          </span>
        </div>

        {/* Latest score */}
        {latest ? (
          <div className="mb-4">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-extrabold text-gray-900">
                {latest.score}
              </span>
              <div className="mb-1">
                <p className="text-xs text-gray-400">Latest</p>
                <p className="text-xs text-gray-500">{formatScoreDate(latest.played_at)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 py-3 text-center">
            <p className="text-sm text-gray-400">No scores yet</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Tap to submit your first round
            </p>
          </div>
        )}

        {/* Average + trend row */}
        {count > 0 && (
          <div className="flex items-center justify-between mb-4 text-sm">
            <div>
              <span className="text-gray-500">Avg </span>
              <span className="font-semibold text-gray-800">
                {average !== null ? `${average} pts` : '—'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <TrendIcon trend={trend} />
              <span className="capitalize">{trend}</span>
            </div>
          </div>
        )}

        {/* Progress bar — 5 score slots */}
        <div aria-label={`${count} of ${MAX_SCORES} score slots filled`}>
          <div className="flex gap-1">
            {Array.from({ length: MAX_SCORES }).map((_, i) => (
              <div
                key={i}
                className={[
                  'h-1.5 flex-1 rounded-full transition-colors duration-300',
                  i < count ? 'bg-green-500' : 'bg-gray-200',
                ].join(' ')}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <ScoreModal initialScores={scores} onClose={closeModal} />
        )}
      </AnimatePresence>
    </>
  )
}
