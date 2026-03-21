/**
 * @fileoverview Client-side Stripe.js helper.
 *
 * Safe to import in 'use client' components.
 * Never import this in a Route Handler or any server-only file —
 * it references NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY only, never the secret key.
 */

/** @type {Promise<import('@stripe/stripe-js').Stripe | null> | null} */
let stripePromise = null

/**
 * Returns a lazily-initialised Stripe.js instance.
 * The promise is cached so loadStripe() only fires once per page lifecycle.
 *
 * @returns {Promise<import('@stripe/stripe-js').Stripe | null>}
 */
export function getStripe() {
  if (!stripePromise) {
    stripePromise = import('@stripe/stripe-js').then(({ loadStripe }) =>
      loadStripe(
        /** @type {string} */ (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      )
    )
  }
  return stripePromise
}
