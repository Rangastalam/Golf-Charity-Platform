/**
 * @fileoverview Stripe client utilities.
 *
 * Server-side:
 *   import { stripe, formatPrice } from '@/lib/stripe'
 *
 * Client-side (lazy-loaded, never bundles the secret key):
 *   import { getStripe } from '@/lib/stripe-client'
 *   const stripe = await getStripe()
 */

import Stripe from 'stripe'
import { STRIPE_API_VERSION } from '@/constants'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing env var: STRIPE_SECRET_KEY')
}

/**
 * Stripe SDK instance — server-side only.
 * Never import this in a Client Component.
 * @type {Stripe}
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
})

// ─── Formatting helpers ───────────────────────────────────────────────────────

/**
 * Formats a Stripe amount (in the smallest currency unit, e.g. cents) as a
 * localised currency string.
 *
 * @example
 *   formatPrice(999, 'usd')   // '$9.99'
 *   formatPrice(10000, 'gbp') // '£100.00'
 *
 * @param {number} amount   Amount in the smallest currency unit (cents, pence…)
 * @param {string} [currency='usd'] ISO 4217 currency code
 * @returns {string}
 */
export function formatPrice(amount, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100)
}
