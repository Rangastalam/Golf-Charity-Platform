/**
 * @fileoverview Pure helper functions for Stableford score validation,
 * formatting, and analysis.
 *
 * These functions are safe to import in both client and server code.
 * They have zero dependencies on Supabase, Stripe, or Next.js internals.
 */

/** Minimum valid Stableford score (one point = "a par") */
const MIN_SCORE = 1

/** Maximum valid Stableford score (9 holes × 5 pts = 45 max) */
const MAX_SCORE = 45

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates a Stableford score value.
 *
 * @param {unknown} score  The value to validate (may be string or number from form input)
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateScore(score) {
  if (score === null || score === undefined || score === '') {
    return { valid: false, error: 'Score is required' }
  }

  const n = Number(score)

  if (Number.isNaN(n)) {
    return { valid: false, error: 'Score must be a number' }
  }

  if (!Number.isInteger(n)) {
    return { valid: false, error: 'Score must be a whole number' }
  }

  if (n < MIN_SCORE || n > MAX_SCORE) {
    return {
      valid: false,
      error: `Score must be between ${MIN_SCORE} and ${MAX_SCORE} (Stableford points)`,
    }
  }

  return { valid: true, error: null }
}

/**
 * Validates a round date string.
 * Rejects future dates, empty values, and non-parseable strings.
 *
 * @param {string | undefined | null} date  ISO date string or yyyy-MM-dd
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateScoreDate(date) {
  if (!date || String(date).trim() === '') {
    return { valid: false, error: 'Date is required' }
  }

  const d = new Date(date)

  if (isNaN(d.getTime())) {
    return { valid: false, error: 'Invalid date' }
  }

  // Compare date-only (strip time component to avoid timezone edge cases)
  const todayStr = new Date().toISOString().slice(0, 10)
  const inputStr = String(date).slice(0, 10)

  if (inputStr > todayStr) {
    return { valid: false, error: 'Date cannot be in the future' }
  }

  return { valid: true, error: null }
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Formats a score date as a human-readable string.
 *
 * @example
 *   formatScoreDate('2025-03-15') // '15 Mar 2025'
 *
 * @param {string | Date} date
 * @returns {string}
 */
export function formatScoreDate(date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Returns today's date as a yyyy-MM-dd string — suitable for <input type="date">
 * default values.
 *
 * @returns {string}
 */
export function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

/**
 * Returns the arithmetic mean of the scores array, rounded to one decimal
 * place. Returns null if the array is empty.
 *
 * @param {Array<{ score: number }>} scores
 * @returns {number | null}
 */
export function getScoreAverage(scores) {
  if (!scores || scores.length === 0) return null

  const sum = scores.reduce((acc, s) => acc + s.score, 0)
  return Math.round((sum / scores.length) * 10) / 10
}

/**
 * Analyses the direction of the last three scores (chronological order).
 * In Stableford, higher points = better performance.
 *
 * Trend logic:
 *  - Compute the net direction across consecutive pairs in the last 3 rounds
 *  - More up-steps than down → 'improving'
 *  - More down-steps than up → 'declining'
 *  - Equal or only 1 score → 'steady'
 *
 * @param {Array<{ score: number, played_at: string }>} scores
 * @returns {'improving' | 'declining' | 'steady'}
 */
export function getScoreTrend(scores) {
  if (!scores || scores.length < 2) return 'steady'

  // Sort ascending by played_at to get chronological order
  const sorted = [...scores].sort(
    (a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime()
  )

  const last3 = sorted.slice(-3)
  let up = 0
  let down = 0

  for (let i = 1; i < last3.length; i++) {
    if (last3[i].score > last3[i - 1].score) up++
    else if (last3[i].score < last3[i - 1].score) down++
  }

  if (up > down) return 'improving'
  if (down > up) return 'declining'
  return 'steady'
}
