/**
 * @fileoverview Prize pool and charity allocation calculator.
 *
 * Given a list of active subscriptions, produces:
 *  - Total monthly revenue
 *  - Prize pool amount
 *  - Charity donation amount
 *  - Platform fee
 *  - Per-winner prize amounts (1st, 2nd, 3rd)
 */

import {
  SUBSCRIPTION_TIERS,
  REVENUE_SPLIT,
  PRIZE_DISTRIBUTION,
} from '../constants/index.js'

// ─── Revenue Calculation ──────────────────────────────────────────────────────

/**
 * @typedef {Object} ActiveSubscription
 * @property {string} userId  - Supabase user UUID
 * @property {string} tierId  - 'bronze' | 'silver' | 'gold'
 */

/**
 * @typedef {Object} RevenueBreakdown
 * @property {number} totalRevenue    - Gross monthly revenue in dollars
 * @property {number} prizePool       - Amount going to prize pool
 * @property {number} charityDonation - Amount going to charity
 * @property {number} platformFee     - Platform operating fee
 * @property {number} subscriberCount - Number of active subscribers
 */

/**
 * Calculates total monthly revenue and its split from a list of active subscriptions.
 *
 * @param {ActiveSubscription[]} subscriptions
 * @returns {RevenueBreakdown}
 */
export function calculateRevenueBreakdown(subscriptions) {
  if (!Array.isArray(subscriptions)) {
    throw new TypeError('subscriptions must be an array')
  }

  let totalRevenue = 0

  for (const sub of subscriptions) {
    const tier = Object.values(SUBSCRIPTION_TIERS).find(
      (t) => t.id === sub.tierId
    )
    if (!tier) {
      console.warn(`Unknown tier "${sub.tierId}" for user ${sub.userId} — skipping`)
      continue
    }
    totalRevenue += tier.priceMonthly
  }

  const prizePool = round2(totalRevenue * REVENUE_SPLIT.PRIZE_POOL)
  const charityDonation = round2(totalRevenue * REVENUE_SPLIT.CHARITY)
  const platformFee = round2(totalRevenue * REVENUE_SPLIT.PLATFORM)

  return {
    totalRevenue: round2(totalRevenue),
    prizePool,
    charityDonation,
    platformFee,
    subscriberCount: subscriptions.length,
  }
}

// ─── Prize Distribution ───────────────────────────────────────────────────────

/**
 * @typedef {Object} PrizeBreakdown
 * @property {number} first   - Prize amount for 1st place
 * @property {number} second  - Prize amount for 2nd place
 * @property {number} third   - Prize amount for 3rd place
 */

/**
 * Splits the prize pool between 1st, 2nd, and 3rd place winners.
 * Any rounding remainder is added to 1st place.
 *
 * @param {number} prizePool - Total prize pool in dollars
 * @returns {PrizeBreakdown}
 */
export function calculatePrizeBreakdown(prizePool) {
  if (typeof prizePool !== 'number' || prizePool < 0) {
    throw new TypeError('prizePool must be a non-negative number')
  }

  const first = round2(prizePool * PRIZE_DISTRIBUTION.FIRST)
  const second = round2(prizePool * PRIZE_DISTRIBUTION.SECOND)
  const third = round2(prizePool * PRIZE_DISTRIBUTION.THIRD)

  // Correct for floating-point rounding — remainder goes to 1st place
  const allocated = round2(first + second + third)
  const remainder = round2(prizePool - allocated)

  return {
    first: round2(first + remainder),
    second,
    third,
  }
}

// ─── Full Monthly Summary ──────────────────────────────────────────────────────

/**
 * @typedef {Object} MonthlySummary
 * @property {RevenueBreakdown} revenue
 * @property {PrizeBreakdown}   prizes
 */

/**
 * Produces a complete monthly financial summary from active subscriptions.
 *
 * @param {ActiveSubscription[]} subscriptions
 * @returns {MonthlySummary}
 */
export function getMonthlySummary(subscriptions) {
  const revenue = calculateRevenueBreakdown(subscriptions)
  const prizes = calculatePrizeBreakdown(revenue.prizePool)
  return { revenue, prizes }
}

// ─── Draw Prize Pool (new schema) ─────────────────────────────────────────────

/**
 * How the prize pool is split between match tiers.
 * Must sum to 1.0.
 */
const MATCH_PRIZE_SPLIT = {
  FIVE_MATCH: 0.60,
  FOUR_MATCH: 0.30,
  THREE_MATCH: 0.10,
}

/**
 * @typedef {Object} PrizePoolBreakdown
 * @property {number} totalPool           - Full prize pool for the month (in currency units)
 * @property {number} fiveMatchPool       - Portion reserved for jackpot (five_match) winners
 * @property {number} fourMatchPool       - Portion reserved for four_match winners
 * @property {number} threeMatchPool      - Portion reserved for three_match winners
 * @property {number} jackpotCarryover    - Carried-over jackpot added to fiveMatchPool
 * @property {number} activeSubscriberCount - Number of active subscribers used for calculation
 */

/**
 * Calculates the prize pool total from a list of active subscriptions.
 * Takes 40% of total monthly revenue (REVENUE_SPLIT.PRIZE_POOL).
 *
 * @param {ActiveSubscription[]} subscriptions
 * @returns {number} Prize pool amount in currency units
 */
export function calculatePrizePool(subscriptions) {
  const { prizePool } = calculateRevenueBreakdown(subscriptions)
  return prizePool
}

/**
 * Splits the prize pool into per-tier allocations, incorporating any jackpot
 * carryover from the previous month into the five_match bucket.
 *
 * Rounding: each tier is computed independently; any sub-cent remainder is
 * absorbed by the three_match bucket (smallest, least visible to winners).
 *
 * @param {number} totalPool        - Prize pool for this month (currency units)
 * @param {number} [jackpotCarryover=0] - Unawarded jackpot from prior month(s)
 * @returns {{ fiveMatchPool: number, fourMatchPool: number, threeMatchPool: number, jackpotCarryover: number }}
 */
export function splitPrizePool(totalPool, jackpotCarryover = 0) {
  if (typeof totalPool !== 'number' || totalPool < 0) {
    throw new TypeError('totalPool must be a non-negative number')
  }
  if (typeof jackpotCarryover !== 'number' || jackpotCarryover < 0) {
    throw new TypeError('jackpotCarryover must be a non-negative number')
  }

  const fiveMatchBase = round2(totalPool * MATCH_PRIZE_SPLIT.FIVE_MATCH)
  const fourMatchPool = round2(totalPool * MATCH_PRIZE_SPLIT.FOUR_MATCH)
  // three_match absorbs any rounding remainder
  const threeMatchPool = round2(totalPool - fiveMatchBase - fourMatchPool)
  const fiveMatchPool = round2(fiveMatchBase + jackpotCarryover)

  return { fiveMatchPool, fourMatchPool, threeMatchPool, jackpotCarryover }
}

/**
 * Calculates the per-winner prize amount when a tier's pool is shared.
 * Any indivisible remainder (floating-point) is dropped — it stays in the pool
 * rather than being silently over-distributed.
 *
 * @param {number} pool        - Total prize for this tier
 * @param {number} winnerCount - Number of winners sharing the pool (must be ≥ 1)
 * @returns {number} Amount each winner receives
 */
export function calculateWinnerPrize(pool, winnerCount) {
  if (typeof pool !== 'number' || pool < 0) {
    throw new TypeError('pool must be a non-negative number')
  }
  if (!Number.isInteger(winnerCount) || winnerCount < 1) {
    throw new TypeError('winnerCount must be a positive integer')
  }
  return round2(pool / winnerCount)
}

/**
 * Determines how much of the five_match pool should carry over to the
 * following month because no member achieved a five_match this draw.
 *
 * If there are five_match winners the jackpot is fully awarded and rollover = 0.
 * If there are no five_match winners the entire fiveMatchPool carries over.
 *
 * @param {number}   fiveMatchPool  - Pool reserved for jackpot this month
 * @param {number}   fiveMatchCount - Number of five_match winners (0 = no winner)
 * @returns {number} Amount to carry forward to next month's fiveMatchPool
 */
export function calculateJackpotRollover(fiveMatchPool, fiveMatchCount) {
  if (typeof fiveMatchPool !== 'number' || fiveMatchPool < 0) {
    throw new TypeError('fiveMatchPool must be a non-negative number')
  }
  if (!Number.isInteger(fiveMatchCount) || fiveMatchCount < 0) {
    throw new TypeError('fiveMatchCount must be a non-negative integer')
  }
  return fiveMatchCount === 0 ? round2(fiveMatchPool) : 0
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Rounds a number to 2 decimal places.
 *
 * @param {number} value
 * @returns {number}
 */
function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Formats a dollar amount as a currency string.
 *
 * @param {number} amount - Amount in dollars
 * @returns {string} e.g. "$1,234.56"
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}
