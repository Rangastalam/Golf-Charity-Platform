/**
 * @fileoverview Standardised API response helpers.
 *
 * Every helper returns a NextResponse with a consistent envelope:
 *   Success: { success: true,  data:  <payload> }
 *   Error:   { success: false, error: <message> }
 *
 * Use these throughout all API routes instead of inline NextResponse.json()
 * calls so the response shape never diverges.
 */

import { NextResponse } from 'next/server'

// ─── Success responses ────────────────────────────────────────────────────────

/**
 * 200 OK (or custom status) with a success envelope.
 *
 * @param {unknown} data
 * @param {number}  [status=200]
 * @returns {NextResponse}
 */
export function success(data, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

// ─── Error responses ──────────────────────────────────────────────────────────

/**
 * Generic error response (default 400 Bad Request).
 *
 * @param {string} message
 * @param {number} [status=400]
 * @returns {NextResponse}
 */
export function error(message, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

/**
 * 401 Unauthorized.
 *
 * @returns {NextResponse}
 */
export function unauthorized() {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
}

/**
 * 403 Forbidden.
 *
 * @returns {NextResponse}
 */
export function forbidden() {
  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
}

/**
 * 404 Not Found.
 *
 * @param {string} [resource='Resource']
 * @returns {NextResponse}
 */
export function notFound(resource = 'Resource') {
  return NextResponse.json(
    { success: false, error: `${resource} not found` },
    { status: 404 }
  )
}

/**
 * 429 Too Many Requests with a Retry-After header.
 *
 * @param {number} retryAfter  Seconds until the client may retry
 * @returns {NextResponse}
 */
export function tooManyRequests(retryAfter) {
  return NextResponse.json(
    { success: false, error: 'Too many requests. Please try again later.' },
    {
      status:  429,
      headers: { 'Retry-After': String(retryAfter) },
    }
  )
}

/**
 * 500 Internal Server Error.
 * Never exposes raw error details outside development.
 *
 * @param {string} [devMessage]  Logged server-side; never sent to client
 * @returns {NextResponse}
 */
export function serverError(devMessage) {
  if (devMessage && process.env.NODE_ENV === 'development') {
    console.error('[API] Internal server error:', devMessage)
  }
  return NextResponse.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  )
}
