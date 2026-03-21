/**
 * @fileoverview Winner display helpers.
 *
 * Pure functions — no I/O, no side effects.
 * Used in both server components and client components.
 */

// ─── Match type formatting ─────────────────────────────────────────────────────

/**
 * Human-readable label for a match_type enum value.
 *
 * @param {'five_match'|'four_match'|'three_match'|string} matchType
 * @returns {string}
 */
export function formatMatchType(matchType) {
  switch (matchType) {
    case 'five_match':  return '5 Number Match'
    case 'four_match':  return '4 Number Match'
    case 'three_match': return '3 Number Match'
    default:            return matchType ?? 'Unknown'
  }
}

/**
 * Short variant used in compact contexts (badges, table cells).
 *
 * @param {'five_match'|'four_match'|'three_match'|string} matchType
 * @returns {string}
 */
export function formatMatchTypeShort(matchType) {
  switch (matchType) {
    case 'five_match':  return '5-Match'
    case 'four_match':  return '4-Match'
    case 'three_match': return '3-Match'
    default:            return matchType ?? '?'
  }
}

// ─── Payment status formatting ─────────────────────────────────────────────────

/**
 * Derives the display status of a winner record.
 * The `winners` table has two payment_status values ('pending'|'paid') plus a
 * separate `verified_at` timestamp.  When payment_status is 'pending' but
 * verified_at is set, the win has been admin-verified and is awaiting payment.
 *
 * @param {'pending'|'paid'|string} paymentStatus
 * @param {string|null|undefined}   verifiedAt     - ISO timestamp or null
 * @returns {'pending'|'verified'|'paid'}
 */
export function deriveDisplayStatus(paymentStatus, verifiedAt) {
  if (paymentStatus === 'paid') return 'paid'
  if (verifiedAt)               return 'verified'
  return 'pending'
}

/**
 * Human-readable label for the display status.
 *
 * @param {'pending'|'verified'|'paid'} displayStatus
 * @returns {string}
 */
export function formatPaymentStatus(displayStatus) {
  switch (displayStatus) {
    case 'paid':     return 'Paid'
    case 'verified': return 'Verified'
    case 'pending':  return 'Pending Verification'
    default:         return displayStatus ?? 'Unknown'
  }
}

// ─── Status colour helpers ─────────────────────────────────────────────────────

/**
 * Tailwind classes for a status badge: background + text colour pair.
 *
 * @param {'pending'|'verified'|'paid'} displayStatus
 * @returns {{ bg: string, text: string }}
 */
export function getStatusColors(displayStatus) {
  switch (displayStatus) {
    case 'paid':
      return { bg: 'bg-green-100', text: 'text-green-800' }
    case 'verified':
      return { bg: 'bg-blue-100',  text: 'text-blue-800'  }
    case 'pending':
    default:
      return { bg: 'bg-amber-100', text: 'text-amber-800' }
  }
}

/**
 * Dot colour for the status indicator circle.
 *
 * @param {'pending'|'verified'|'paid'} displayStatus
 * @returns {string} Tailwind bg-* class
 */
export function getStatusDotColor(displayStatus) {
  switch (displayStatus) {
    case 'paid':     return 'bg-green-500'
    case 'verified': return 'bg-blue-500'
    case 'pending':
    default:         return 'bg-amber-400'
  }
}

// ─── Financials ────────────────────────────────────────────────────────────────

/**
 * Sums the prize_amount for all winners with payment_status === 'paid'.
 *
 * @param {Array<{ prize_amount: number|string, payment_status: string }>} winners
 * @returns {number}
 */
export function calculateTotalWinnings(winners) {
  if (!Array.isArray(winners)) return 0
  return winners.reduce((sum, w) => {
    if (w.payment_status === 'paid') {
      return sum + Number(w.prize_amount ?? 0)
    }
    return sum
  }, 0)
}

/**
 * Sums prize_amount regardless of payment status — total ever won.
 *
 * @param {Array<{ prize_amount: number|string }>} winners
 * @returns {number}
 */
export function calculatePotentialWinnings(winners) {
  if (!Array.isArray(winners)) return 0
  return winners.reduce((sum, w) => sum + Number(w.prize_amount ?? 0), 0)
}

// ─── Eligibility ───────────────────────────────────────────────────────────────

/**
 * Returns true if the winner is eligible to upload proof.
 * Conditions:
 *  - payment_status is 'pending' (not yet paid)
 *  - proof_url is absent (haven't uploaded yet)
 *  - verified_at is absent (not yet admin-verified, so upload is still relevant)
 *
 * @param {{ payment_status: string, proof_url?: string|null, verified_at?: string|null }} winner
 * @returns {boolean}
 */
export function isEligibleToUploadProof(winner) {
  return (
    winner.payment_status !== 'paid' &&
    !winner.proof_url &&
    !winner.verified_at
  )
}

/**
 * Returns true if a winner record is awaiting admin payment action.
 * (Verified but not yet marked paid.)
 *
 * @param {{ payment_status: string, verified_at?: string|null }} winner
 * @returns {boolean}
 */
export function isAwaitingPayment(winner) {
  return winner.payment_status === 'pending' && !!winner.verified_at
}
