/**
 * @fileoverview Global error handling utilities.
 *
 * Categorises Supabase, Stripe, and unknown errors into user-friendly messages.
 * Never exposes internal error details (stack traces, query text, etc.) in
 * production.
 *
 * Returns: { message: string, code: string, field?: string }
 */

const IS_DEV = process.env.NODE_ENV === 'development'

// ─── Type guards ──────────────────────────────────────────────────────────────

/**
 * Returns true when the error looks like it came from Supabase/PostgREST.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export function isSupabaseError(error) {
  if (!error || typeof error !== 'object') return false
  // PostgREST errors have a `code` property (e.g. '23505', 'PGRST116')
  // Supabase JS client errors have a `message` and sometimes a `details` field
  return 'code' in error || 'details' in error || 'hint' in error
}

/**
 * Returns true when the error looks like it came from the Stripe SDK.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export function isStripeError(error) {
  if (!error || typeof error !== 'object') return false
  return 'type' in error && String(error.type).startsWith('Stripe')
    || 'raw' in error           // stripe-js error shape
    || error?.constructor?.name === 'StripeError'
}

// ─── Error message maps ────────────────────────────────────────────────────────

/**
 * Maps a Supabase/PostgREST error code to a human-readable message.
 *
 * @param {{ code?: string, message?: string }} error
 * @returns {string}
 */
export function getSupabaseErrorMessage(error) {
  const code = String(error?.code ?? '')

  const MESSAGES = {
    // PostgreSQL constraint violations
    '23505': 'This email is already registered.',
    '23503': 'Related record not found.',
    '23502': 'A required field is missing.',
    '42501': 'You do not have permission to perform this action.',
    // PostgREST
    'PGRST116': 'Record not found.',
    'PGRST204': 'No content returned.',
    'PGRST301': 'Role permission denied.',
    // Auth
    'invalid_credentials':  'Incorrect email or password.',
    'email_not_confirmed':  'Please confirm your email address before signing in.',
    'user_already_exists':  'An account with this email already exists.',
    'weak_password':        'Password is too weak. Choose a stronger password.',
    'over_request_rate_limit': 'Too many requests. Please wait a moment and try again.',
  }

  if (MESSAGES[code]) return MESSAGES[code]

  // Fall back to the raw message in dev, generic in prod
  return IS_DEV && error?.message
    ? `Database error: ${error.message}`
    : 'A database error occurred. Please try again.'
}

/**
 * Maps a Stripe error code to a human-readable message.
 *
 * @param {{ code?: string, decline_code?: string, message?: string }} error
 * @returns {string}
 */
export function getStripeErrorMessage(error) {
  const code        = String(error?.code ?? '')
  const declineCode = String(error?.decline_code ?? '')

  // Decline codes (most specific)
  const DECLINE = {
    card_declined:         'Your card was declined. Please try a different card.',
    insufficient_funds:    'Insufficient funds. Please try a different card.',
    lost_card:             'Your card has been reported lost. Please use a different card.',
    stolen_card:           'Your card has been reported stolen. Please use a different card.',
    expired_card:          'Your card has expired. Please update your card details.',
    incorrect_cvc:         'Incorrect CVC code. Please check your card details.',
    incorrect_zip:         'Incorrect postcode. Please check your billing address.',
    do_not_honor:          'Your bank declined the payment. Please contact your bank.',
    fraudulent:            'Payment declined for security reasons. Please contact your bank.',
    generic_decline:       'Your card was declined. Please try a different card.',
  }

  // Error codes
  const CODES = {
    card_declined:         'Your card was declined.',
    expired_card:          'Your card has expired. Please update your card details.',
    incorrect_cvc:         'Incorrect CVC code.',
    incorrect_number:      'Invalid card number.',
    invalid_expiry_month:  'Invalid expiry month.',
    invalid_expiry_year:   'Invalid expiry year.',
    invalid_cvc:           'Invalid CVC.',
    processing_error:      'A processing error occurred. Please try again.',
    rate_limit:            'Too many requests. Please wait a moment.',
  }

  if (DECLINE[declineCode]) return DECLINE[declineCode]
  if (CODES[code])          return CODES[code]

  return IS_DEV && error?.message
    ? `Payment error: ${error.message}`
    : 'A payment error occurred. Please try again or use a different card.'
}

// ─── Main handler ──────────────────────────────────────────────────────────────

/**
 * Categorises any thrown error into a consistent { message, code, field? } shape.
 * Safe to pass directly to API responses — never leaks internals in production.
 *
 * @param {unknown} error
 * @param {string}  [context]  Label for server-side logging (never sent to client)
 * @returns {{ message: string, code: string, field?: string }}
 */
export function handleAPIError(error, context) {
  // Log for observability — server-side only
  if (context) {
    console.error(`[${context}]`, IS_DEV ? error : String(error?.message ?? error))
  }

  if (isSupabaseError(error)) {
    return {
      message: getSupabaseErrorMessage(error),
      code:    String(error?.code ?? 'DB_ERROR'),
    }
  }

  if (isStripeError(error)) {
    return {
      message: getStripeErrorMessage(error),
      code:    String(error?.code ?? 'STRIPE_ERROR'),
    }
  }

  // Validation errors — thrown with a { field, message } shape
  if (error && typeof error === 'object' && 'field' in error && 'message' in error) {
    return {
      message: String(error.message),
      code:    'VALIDATION_ERROR',
      field:   String(error.field),
    }
  }

  const rawMessage = error instanceof Error ? error.message : String(error ?? '')

  return {
    message: IS_DEV ? rawMessage : 'An unexpected error occurred. Please try again.',
    code:    'UNKNOWN_ERROR',
  }
}
