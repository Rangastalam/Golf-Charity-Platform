'use client'

/**
 * @fileoverview Score entry form.
 *
 * Renders a number stepper for the Stableford score (1–45) and a date picker.
 * Validates client-side before calling POST /api/scores.
 * Calls onScoreAdded(updatedScores) on success.
 *
 * @param {{ onScoreAdded: (scores: Array) => void }} props
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { validateScore, validateScoreDate, todayInputValue } from '@/lib/scoreHelpers'
import { useToast } from '@/components/shared/Toast'

const MIN = 1
const MAX = 45

export default function ScoreEntry({ onScoreAdded }) {
  const toast    = useToast()
  const [score, setScore] = useState(36)
  const [playedAt, setPlayedAt] = useState(todayInputValue)
  const [scoreError, setScoreError] = useState(null)
  const [dateError, setDateError] = useState(null)
  const [apiError, setApiError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // ── Stepper helpers ────────────────────────────────────────────────────────

  function increment() {
    setScore((prev) => Math.min(prev + 1, MAX))
    setScoreError(null)
  }

  function decrement() {
    setScore((prev) => Math.max(prev - 1, MIN))
    setScoreError(null)
  }

  function handleScoreInput(e) {
    const raw = e.target.value
    if (raw === '') {
      setScore('')
      return
    }
    const n = parseInt(raw, 10)
    if (!isNaN(n)) {
      setScore(Math.min(Math.max(n, MIN), MAX))
    }
    setScoreError(null)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault()
    setApiError(null)
    setSuccess(false)

    // Client-side validation
    const sv = validateScore(score)
    const dv = validateScoreDate(playedAt)

    setScoreError(sv.valid ? null : sv.error)
    setDateError(dv.valid ? null : dv.error)

    if (!sv.valid || !dv.valid) return

    setLoading(true)
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: Number(score), played_at: playedAt }),
      })

      const data = await res.json()

      if (!res.ok) {
        const message = data.error ?? 'Failed to save score. Please try again.'
        setApiError(message)
        toast.error(message)
        return
      }

      // Show warning if a score already exists for this date
      if (data.warning) {
        toast.warning(data.warning)
      } else {
        toast.success('Score saved!')
      }

      setSuccess(true)
      setScore(36)
      setPlayedAt(todayInputValue())

      if (onScoreAdded) onScoreAdded(data.scores)

      setTimeout(() => setSuccess(false), 3000)
    } catch {
      const message = 'Network error. Please check your connection.'
      setApiError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bg-gray-800 rounded-2xl border border-gray-700 p-6"
    >
      <h2 className="text-base font-semibold text-white mb-1">Submit a score</h2>
      <p className="text-xs text-gray-400 mb-5">
        Enter your Stableford points for the round (1–45).
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* ── Score stepper ─────────────────────────────────────────────── */}
          <div className="flex-1">
            <label
              htmlFor="score-input"
              className="block text-xs font-medium text-gray-300 mb-1.5"
            >
              Stableford points
            </label>
            <div className="flex items-center gap-0">
              <button
                type="button"
                onClick={decrement}
                disabled={score <= MIN}
                aria-label="Decrease score"
                className="w-10 h-11 flex items-center justify-center rounded-l-xl bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-gray-600 border-r-0"
              >
                <span className="text-lg leading-none select-none">−</span>
              </button>
              <input
                id="score-input"
                type="number"
                value={score}
                onChange={handleScoreInput}
                min={MIN}
                max={MAX}
                aria-describedby={scoreError ? 'score-error' : undefined}
                className={[
                  'w-16 h-11 text-center text-white text-lg font-bold bg-gray-700 border-y',
                  'border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:z-10',
                  scoreError ? 'border-red-500' : '',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={increment}
                disabled={score >= MAX}
                aria-label="Increase score"
                className="w-10 h-11 flex items-center justify-center rounded-r-xl bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-gray-600 border-l-0"
              >
                <span className="text-lg leading-none select-none">+</span>
              </button>
            </div>
            <AnimatePresence mode="wait">
              {scoreError && (
                <motion.p
                  key="score-err"
                  id="score-error"
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-red-400 mt-1.5"
                >
                  {scoreError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* ── Date picker ───────────────────────────────────────────────── */}
          <div className="flex-1">
            <label
              htmlFor="played-at-input"
              className="block text-xs font-medium text-gray-300 mb-1.5"
            >
              Date played
            </label>
            <input
              id="played-at-input"
              type="date"
              value={playedAt}
              max={todayInputValue()}
              onChange={(e) => {
                setPlayedAt(e.target.value)
                setDateError(null)
              }}
              aria-describedby={dateError ? 'date-error' : undefined}
              className={[
                'w-full h-11 rounded-xl bg-gray-700 border border-gray-600 text-white px-3',
                'focus:outline-none focus:ring-2 focus:ring-green-500',
                'text-sm [color-scheme:dark]',
                dateError ? 'border-red-500' : '',
              ].join(' ')}
            />
            <AnimatePresence mode="wait">
              {dateError && (
                <motion.p
                  key="date-err"
                  id="date-error"
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-red-400 mt-1.5"
                >
                  {dateError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* ── Submit ────────────────────────────────────────────────────── */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className={[
                'h-11 px-6 rounded-xl text-sm font-bold transition-all duration-200',
                'bg-green-600 hover:bg-green-500 text-white',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'whitespace-nowrap',
              ].join(' ')}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
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
                  Saving…
                </span>
              ) : (
                'Save score'
              )}
            </button>
          </div>
        </div>

        {/* ── API error ─────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {apiError && (
            <motion.p
              key="api-err"
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-2"
            >
              {apiError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── Success confirmation ───────────────────────────────────────────── */}
        <AnimatePresence>
          {success && (
            <motion.p
              key="success"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 text-sm text-green-300 bg-green-900/30 border border-green-700 rounded-lg px-4 py-2 flex items-center gap-2"
            >
              <span aria-hidden="true">✓</span> Score saved!
            </motion.p>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  )
}
