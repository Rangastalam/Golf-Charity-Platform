/**
 * @fileoverview Monthly prize draw engine — Stableford Number Match.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 1. INTERPRETATION OF THE ALGORITHMIC DRAW
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * The platform records members' Stableford scores (integers 1–45 per round,
 * max 5 rounds per member). Rather than pick winners at random from a subscriber
 * pool (the old design), the new system runs a *number-match lottery*:
 *
 *   • Five numbers are drawn from 1–45 (the "winning numbers").
 *   • Each member's draw entry contains a snapshot of their recent scores.
 *   • A member wins if enough of the drawn numbers appear in their snapshot:
 *       - 5 matches → five_match  (jackpot)
 *       - 4 matches → four_match  (second prize)
 *       - 3 matches → three_match (third prize)
 *
 * In RANDOM mode the five numbers are chosen via a seeded PRNG — reproducible
 * from the month string, auditable, but not influenced by member data.
 *
 * In ALGORITHMIC mode the five numbers are derived from the community's actual
 * scoring data: we tally how often every value (1–45) appears across all
 * members' score snapshots stored in draw_entries, then take the five most
 * popular values.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 2. WHY THIS WEIGHTING APPROACH
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Choosing the *most common* scores achieves two things simultaneously:
 *
 *   a) **Engagement-driven fairness** — members who play regularly and log
 *      their rounds are more likely to have posted the popular values, so
 *      active participation translates into more winning opportunities. This
 *      rewards the habit of logging without favouring any particular skill level.
 *
 *   b) **Community reflection** — the winning numbers literally *are* the
 *      community's most typical scores that month.  That makes the result
 *      feel meaningful and narrows the explanation to one sentence: "These
 *      were the scores most of our members shot this month."
 *
 * Tie-breaking (equal frequency) uses the *higher* score value. Stableford
 * awards more points for better holes, so higher scores indicate stronger
 * play. Giving the tiebreak to the higher score rewards good performance
 * without over-complicating the algorithm.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 3. EDGE CASES HANDLED
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *   • Fewer than 5 distinct score values across all entries (very early month):
 *     the remaining slots are filled with deterministic random numbers from
 *     1–45 using the month-seeded PRNG, avoiding duplicates.
 *
 *   • Members with fewer than 5 scores (3 or 4): their snapshot is shorter
 *     than the drawn set, so they can match at most 3 or 4 numbers. They can
 *     still win four_match or three_match prizes.
 *
 *   • Multiple winners at the same tier: all are recorded; the prize pool for
 *     that tier is split equally (see calculateWinnerPrize in prizePool.js).
 *
 *   • No five_match winner: the jackpot (five_match_pool) carries over and is
 *     added to next month's five_match_pool via jackpot_carryover.
 *
 *   • Duplicate scores in a snapshot: scores are deduplicated before matching
 *     because possessing "18, 18" should not count as two chances to match 18.
 *     Only distinct values matter.
 *
 *   • Empty entry list: findAllWinners returns empty arrays for all tiers
 *     rather than throwing, so the caller decides how to handle a prizeless draw.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} DrawEntry
 * @property {string}   userId          - Supabase user UUID
 * @property {number[]} scoresSnapshot  - Member's score values at entry time (1–45 each)
 */

/**
 * @typedef {'five_match'|'four_match'|'three_match'} MatchType
 */

/**
 * @typedef {Object} DrawWinner
 * @property {string}    userId     - Winning member's UUID
 * @property {MatchType} matchType  - Level of match achieved
 * @property {number}    matchCount - Exact number of drawn values matched
 */

/**
 * @typedef {Object} DrawResult
 * @property {number[]}     drawnNumbers  - The five winning values (1–45)
 * @property {DrawWinner[]} fiveMatch     - Members who matched all 5
 * @property {DrawWinner[]} fourMatch     - Members who matched exactly 4
 * @property {DrawWinner[]} threeMatch    - Members who matched exactly 3
 * @property {boolean}      hasJackpot    - Whether at least one five_match winner exists
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Valid score range (mirrors CHECK constraint on the scores table) */
const SCORE_MIN = 1
const SCORE_MAX = 45

/** Number of values drawn per month */
const DRAW_SIZE = 5

// ─── Seeded PRNG ──────────────────────────────────────────────────────────────

/**
 * Creates a seeded pseudo-random number generator (mulberry32).
 * Deterministic: same seed → same sequence.
 *
 * @param {number} seed - 32-bit unsigned integer seed
 * @returns {() => number} Function producing floats in [0, 1)
 */
function createSeededRng(seed) {
  let s = seed >>> 0
  return function rng() {
    s += 0x6d2b79f5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Converts a 'YYYY-MM' month string to a numeric seed.
 * Same month → same seed → same random sequence.
 *
 * @param {string} month - 'YYYY-MM'
 * @returns {number}
 */
function monthToSeed(month) {
  // e.g. '2025-03' → 202503
  const [year, mon] = month.split('-').map(Number)
  return year * 100 + mon
}

// ─── Random Draw ──────────────────────────────────────────────────────────────

/**
 * Picks DRAW_SIZE unique integers from [SCORE_MIN, SCORE_MAX] using the
 * month-seeded PRNG. Fully deterministic and auditable.
 *
 * @param {string} month - 'YYYY-MM'
 * @returns {number[]} Sorted array of DRAW_SIZE unique values
 */
export function generateRandomDraw(month) {
  const rng = createSeededRng(monthToSeed(month))
  const range = SCORE_MAX - SCORE_MIN + 1
  const picked = new Set()

  while (picked.size < DRAW_SIZE) {
    const value = SCORE_MIN + Math.floor(rng() * range)
    picked.add(value)
  }

  return [...picked].sort((a, b) => a - b)
}

// ─── Algorithmic Draw ─────────────────────────────────────────────────────────

/**
 * Derives DRAW_SIZE winning numbers from the community's aggregated score data.
 *
 * Algorithm:
 *  1. Tally how often each distinct value (1–45) appears across all entries'
 *     score snapshots (deduplicated per member so one member can't skew totals).
 *  2. Sort by frequency descending; ties broken by higher value descending
 *     (higher Stableford = better golf, rewarded in the tiebreak).
 *  3. Take the top DRAW_SIZE values.
 *  4. If fewer than DRAW_SIZE distinct values exist, pad with seeded-random
 *     values not already selected.
 *
 * @param {DrawEntry[]} allEntries - Every draw entry for the month
 * @param {string}      month     - 'YYYY-MM' (used for PRNG seed when padding)
 * @returns {number[]} Sorted array of DRAW_SIZE unique values
 */
export function generateAlgorithmicDraw(allEntries, month) {
  // Tally frequencies — one count per distinct value per member
  /** @type {Map<number, number>} value → community-wide frequency */
  const freq = new Map()

  for (const entry of allEntries) {
    const distinctScores = new Set(
      (entry.scoresSnapshot ?? []).filter(
        (s) => Number.isInteger(s) && s >= SCORE_MIN && s <= SCORE_MAX
      )
    )
    for (const score of distinctScores) {
      freq.set(score, (freq.get(score) ?? 0) + 1)
    }
  }

  // Sort by frequency desc, then value desc (higher score wins tie)
  const ranked = [...freq.entries()].sort(([va, fa], [vb, fb]) => {
    if (fb !== fa) return fb - fa
    return vb - va
  })

  const picked = new Set(ranked.slice(0, DRAW_SIZE).map(([v]) => v))

  // Pad with seeded-random values if community data is sparse
  if (picked.size < DRAW_SIZE) {
    const rng = createSeededRng(monthToSeed(month))
    const range = SCORE_MAX - SCORE_MIN + 1

    while (picked.size < DRAW_SIZE) {
      const value = SCORE_MIN + Math.floor(rng() * range)
      picked.add(value)
    }
  }

  return [...picked].sort((a, b) => a - b)
}

// ─── Match Checking ───────────────────────────────────────────────────────────

/**
 * Counts how many of the drawn numbers appear in a member's score snapshot.
 * Scores are deduplicated: possessing "18, 18" doesn't count twice for 18.
 *
 * @param {number[]} scoresSnapshot - Member's scores at entry time
 * @param {number[]} drawnNumbers   - The five drawn values
 * @returns {number} Count of matched values (0–DRAW_SIZE)
 */
export function checkMatch(scoresSnapshot, drawnNumbers) {
  const memberSet = new Set(
    (scoresSnapshot ?? []).filter(
      (s) => Number.isInteger(s) && s >= SCORE_MIN && s <= SCORE_MAX
    )
  )
  return drawnNumbers.filter((n) => memberSet.has(n)).length
}

/**
 * Resolves a match count to a MatchType string, or null if below threshold.
 *
 * @param {number} matchCount
 * @returns {MatchType|null}
 */
function resolveMatchType(matchCount) {
  if (matchCount === 5) return 'five_match'
  if (matchCount === 4) return 'four_match'
  if (matchCount === 3) return 'three_match'
  return null
}

// ─── Winner Finder ────────────────────────────────────────────────────────────

/**
 * Evaluates every draw entry against the drawn numbers and returns categorised
 * winners. A single member can only appear in one category (their highest match).
 *
 * @param {DrawEntry[]} drawEntries  - All entries for the draw
 * @param {number[]}    drawnNumbers - The five drawn values
 * @returns {DrawResult}
 */
export function findAllWinners(drawEntries, drawnNumbers) {
  /** @type {DrawWinner[]} */
  const fiveMatch = []
  /** @type {DrawWinner[]} */
  const fourMatch = []
  /** @type {DrawWinner[]} */
  const threeMatch = []

  for (const entry of drawEntries) {
    const count = checkMatch(entry.scoresSnapshot, drawnNumbers)
    const matchType = resolveMatchType(count)
    if (!matchType) continue

    const winner = {
      userId: entry.userId,
      matchType,
      matchCount: count,
    }

    if (matchType === 'five_match') fiveMatch.push(winner)
    else if (matchType === 'four_match') fourMatch.push(winner)
    else threeMatch.push(winner)
  }

  return {
    drawnNumbers,
    fiveMatch,
    fourMatch,
    threeMatch,
    hasJackpot: fiveMatch.length > 0,
  }
}
