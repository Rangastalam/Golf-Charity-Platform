/**
 * @fileoverview Global application constants for the Golf Charity Platform.
 * All business-logic numbers live here — change once, reflected everywhere.
 */

// ─── Subscription Tiers ───────────────────────────────────────────────────────

/** @type {Object.<string, {id: string, name: string, priceMonthly: number, stripePriceEnvKey: string, drawEntries: number, color: string, features: string[]}>} */
export const SUBSCRIPTION_TIERS = {
  BRONZE: {
    id: 'bronze',
    name: 'Bronze',
    priceMonthly: 9.99,
    stripePriceEnvKey: 'STRIPE_PRICE_BRONZE',
    drawEntries: 1,
    color: 'amber-700',
    features: [
      '1 draw entry per month',
      'Access to charity leaderboard',
      'Monthly score tracking',
      'Community forum access',
    ],
  },
  SILVER: {
    id: 'silver',
    name: 'Silver',
    priceMonthly: 24.99,
    stripePriceEnvKey: 'STRIPE_PRICE_SILVER',
    drawEntries: 3,
    color: 'slate-400',
    features: [
      '3 draw entries per month',
      'Handicap tracking',
      'Priority charity voting',
      'Monthly score tracking',
      'Community forum access',
      'Early draw results',
    ],
  },
  GOLD: {
    id: 'gold',
    name: 'Gold',
    priceMonthly: 49.99,
    stripePriceEnvKey: 'STRIPE_PRICE_GOLD',
    drawEntries: 6,
    color: 'yellow-500',
    features: [
      '6 draw entries per month',
      'Handicap tracking',
      'Charity nomination rights',
      'Priority charity voting',
      'Monthly score tracking',
      'Community forum access',
      'Early draw results',
      'Annual gala invitation',
    ],
  },
}

/** @type {string[]} Tier IDs in ascending order */
export const TIER_ORDER = ['bronze', 'silver', 'gold']

// ─── Revenue Split ────────────────────────────────────────────────────────────

/**
 * How each dollar of subscription revenue is allocated.
 * Must sum to 1.0.
 */
export const REVENUE_SPLIT = {
  /** Portion paid into the monthly prize pool */
  PRIZE_POOL: 0.40,
  /** Portion donated to the selected charity */
  CHARITY: 0.40,
  /** Platform operating fee */
  PLATFORM: 0.20,
}

// ─── Prize Distribution ───────────────────────────────────────────────────────

/**
 * How the prize pool is split between draw winners.
 * Must sum to 1.0.
 */
export const PRIZE_DISTRIBUTION = {
  FIRST: 0.60,
  SECOND: 0.30,
  THIRD: 0.10,
}

/** Number of winners per monthly draw */
export const DRAW_WINNER_COUNT = 3

// ─── Draw Schedule ────────────────────────────────────────────────────────────

/** Day of the month on which draws are executed (1–28) */
export const DRAW_DAY_OF_MONTH = 28

// ─── Golf Score Settings ──────────────────────────────────────────────────────

/** Minimum acceptable gross score (sanity check) */
export const MIN_GROSS_SCORE = 54

/** Maximum acceptable gross score (sanity check) */
export const MAX_GROSS_SCORE = 180

/** Maximum allowed handicap index */
export const MAX_HANDICAP = 54

// ─── User Roles ───────────────────────────────────────────────────────────────

export const USER_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
}

// ─── Subscription Plans (billing frequency) ───────────────────────────────────

/**
 * Billing-frequency plans shown on the pricing page.
 * Prices are in USD cents to match Stripe's representation.
 * @type {Object.<string, {id: string, name: string, priceCents: number, priceDisplay: string, stripePriceEnvKey: string, billingInterval: string, savingsPercent: number|null}>}
 */
export const PLANS = {
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    priceCents: 999,
    priceDisplay: '₹999',
    perMonthDisplay: '₹999',
    stripePriceEnvKey: 'STRIPE_PRICE_MONTHLY',
    billingInterval: 'month',
    savingsPercent: null,
    badge: null,
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly',
    priceCents: 9999,
    priceDisplay: '$₹9999',
    perMonthDisplay: '₹9999',
    stripePriceEnvKey: 'STRIPE_PRICE_YEARLY',
    billingInterval: 'year',
    savingsPercent: 17,
    badge: 'Best Value',
  },
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  PRICING: '/pricing',
  CHARITIES: '/charities',
  HOW_IT_WORKS: '/how-it-works',
  ADMIN: '/admin',
}

// ─── API Routes ───────────────────────────────────────────────────────────────

export const API_ROUTES = {
  AUTH: '/api/auth',
  SCORES: '/api/scores',
  DRAWS: '/api/draws',
  CHARITIES: '/api/charities',
  SUBSCRIPTIONS: '/api/subscriptions',
  SUBSCRIPTION_CHECKOUT: '/api/subscriptions/create-checkout',
  SUBSCRIPTION_PORTAL: '/api/subscriptions/portal',
  SUBSCRIPTION_STATUS: '/api/subscriptions/status',
  WEBHOOKS_STRIPE: '/api/webhooks/stripe',
}

// ─── Stripe Config ────────────────────────────────────────────────────────────

/** Stripe API version pinned for this project */
export const STRIPE_API_VERSION = '2024-06-20'

/** Number of days before a subscription is considered past-due before access is revoked */
export const SUBSCRIPTION_GRACE_PERIOD_DAYS = 3
