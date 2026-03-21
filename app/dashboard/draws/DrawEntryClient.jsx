/**
 * @fileoverview Client component that handles the draw entry submission.
 *
 * Displays the user's recent scores, eligibility status, and an "Enter Draw"
 * button. On success, shows a confirmation state with the snapshotted scores.
 *
 * @param {{
 *   userId: string,
 *   month: string,
 *   currentEntry: object|null,
 *   recentScores: Array<{id: string, gross_score: number, course_name: string, played_at: string}>,
 *   hasMinScores: boolean
 * }} props
 */

'use client'

import { useState }    from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const MIN_SCORES = 3

/**
 * @param {{ date: string }} props
 */
function ScoreRow({ score }) {
  const date = new Date(score.played_at).toLocaleDateString('en-GB', {
    day:   'numeric',
    month: 'short',
  })
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-semibold text-gray-900">{score.gross_score}</p>
        <p className="text-xs text-gray-400">{score.course_name || 'Unknown course'} · {date}</p>
      </div>
      <span className="text-xs bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded-full">
        {score.gross_score} pts
      </span>
    </div>
  )
}

/**
 * @param {{ userId: string, month: string, currentEntry: object|null, recentScores: Array, hasMinScores: boolean }} props
 */
export default function DrawEntryClient({
  userId,
  month,
  currentEntry: initialEntry,
  recentScores,
  hasMinScores,
}) {
  const [entry,      setEntry]      = useState(initialEntry)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState(null)

  async function handleEnter() {
    setSubmitting(true)
    setError(null)

    try {
      const res  = await fetch('/api/draws/entries', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ month }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Failed to enter draw. Please try again.')
        return
      }

      setEntry(json.entry)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Already entered ──────────────────────────────────────────────────────────
  if (entry) {
    const snapshot = entry.scores_snapshot ?? []
    const enteredAt = new Date(entry.created_at).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <span className="text-xl">✅</span>
          <div>
            <p className="text-sm font-semibold text-green-800">You're in the draw!</p>
            <p className="text-xs text-green-600">Entered {enteredAt}</p>
          </div>
        </div>

        {snapshot.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Your snapshotted scores
            </p>
            <div className="bg-gray-50 rounded-xl px-4 divide-y divide-gray-100">
              {snapshot.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <p className="text-sm text-gray-700">Score #{i + 1}</p>
                  <span className="text-sm font-black text-gray-900">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          Results will be published on the 28th of this month.
        </p>
      </motion.div>
    )
  }

  // ── Not yet entered ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Scores preview */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Your recent scores ({recentScores.length} / {MIN_SCORES} min required)
        </p>

        {recentScores.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500">No scores recorded yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Log at least {MIN_SCORES} scores to enter the draw.
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl px-4 divide-y divide-gray-100">
            {recentScores.map((s) => (
              <ScoreRow key={s.id} score={s} />
            ))}
          </div>
        )}
      </div>

      {/* Eligibility message */}
      {!hasMinScores && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-base mt-0.5">⚠️</span>
          <p className="text-xs text-amber-700">
            You need at least {MIN_SCORES} scores to enter the draw.{' '}
            {recentScores.length > 0
              ? `You have ${recentScores.length} — log ${MIN_SCORES - recentScores.length} more.`
              : 'Start logging your rounds.'}
          </p>
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* CTA */}
      <button
        onClick={handleEnter}
        disabled={!hasMinScores || submitting}
        className="w-full bg-green-800 text-white text-sm font-bold py-3 rounded-xl hover:bg-green-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'Entering draw…' : 'Enter This Month\'s Draw'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Entering locks your 5 best scores as a snapshot. You can only enter once per month.
      </p>
    </div>
  )
}
