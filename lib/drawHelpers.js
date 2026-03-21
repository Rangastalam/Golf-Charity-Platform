/**
 * @fileoverview Draw utility helpers.
 *
 * Pure functions — no I/O, no network, no side effects.
 * Shared between API routes and the draw engine.
 */

import { DRAW_DAY_OF_MONTH } from '@/constants'

// ─── Month Strings ─────────────────────────────────────────────────────────────

/**
 * Returns the current month as a 'YYYY-MM' string.
 *
 * @returns {string}
 */
export function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Returns the draw date for a given 'YYYY-MM' month string.
 * The draw always takes place on DRAW_DAY_OF_MONTH.
 *
 * @param {string} month - 'YYYY-MM'
 * @returns {Date}
 */
export function getDrawDateForMonth(month) {
  const [year, mon] = month.split('-').map(Number)
  return new Date(year, mon - 1, DRAW_DAY_OF_MONTH, 12, 0, 0)
}

/**
 * Returns the next upcoming draw date (today's month if draw hasn't happened yet,
 * otherwise next month).
 *
 * @returns {Date}
 */
export function getNextDrawDate() {
  const now = new Date()
  const drawThisMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    DRAW_DAY_OF_MONTH,
    12, 0, 0
  )
  if (now < drawThisMonth) return drawThisMonth

  return new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    DRAW_DAY_OF_MONTH,
    12, 0, 0
  )
}

/**
 * Formats a 'YYYY-MM' string to a human-readable label.
 * e.g. '2025-03' → 'March 2025'
 *
 * @param {string} month - 'YYYY-MM'
 * @returns {string}
 */
export function formatDrawMonth(month) {
  const [year, mon] = month.split('-').map(Number)
  return new Date(year, mon - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

// ─── Validation ────────────────────────────────────────────────────────────────

/**
 * Validates that a value is in 'YYYY-MM' format and represents a real month.
 *
 * @param {unknown} month
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateMonth(month) {
  if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
    return { valid: false, error: 'month must be in YYYY-MM format' }
  }

  const [year, mon] = month.split('-').map(Number)
  if (mon < 1 || mon > 12) {
    return { valid: false, error: 'month month value must be between 01 and 12' }
  }
  if (year < 2020 || year > 2100) {
    return { valid: false, error: 'year is out of valid range (2020–2100)' }
  }

  return { valid: true }
}

/**
 * Validates that a draw mode string is one of the accepted values.
 *
 * @param {unknown} mode
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateDrawMode(mode) {
  if (mode !== 'random' && mode !== 'algorithmic') {
    return { valid: false, error: 'mode must be "random" or "algorithmic"' }
  }
  return { valid: true }
}

// ─── Eligibility ───────────────────────────────────────────────────────────────

/**
 * Minimum number of scores a member must have logged to enter the draw.
 * Having at least 3 scores gives the match-checking algorithm something
 * meaningful to compare against the 5 drawn numbers.
 */
export const MIN_SCORES_FOR_ENTRY = 3

/**
 * Checks whether a member meets the minimum criteria to enter the draw.
 *
 * @param {{ status: string, scoreCount: number }} member
 * @returns {boolean}
 */
export function isEligibleForDraw(member) {
  return member.status === 'active' && member.scoreCount >= MIN_SCORES_FOR_ENTRY
}
