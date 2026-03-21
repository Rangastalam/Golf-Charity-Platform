/**
 * @fileoverview Server-side auth helper functions.
 *
 * All functions are async and accept a cookieStore (the resolved value of
 * `await cookies()` from `next/headers`).
 *
 * Usage in a Route Handler:
 *   import { cookies } from 'next/headers'
 *   import { requireAuth, requireAdmin } from '@/lib/auth'
 *
 *   export async function GET() {
 *     const cookieStore = await cookies()
 *     const { user, profile } = await requireAuth(cookieStore)
 *     // ...
 *   }
 */

import { createServerSupabaseClient } from '@/lib/supabase'

// ─── Types (JSDoc) ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} AuthResult
 * @property {import('@supabase/supabase-js').User} user        - Supabase auth user
 * @property {Object}                                profile     - Row from public.profiles
 * @property {string}                                profile.id
 * @property {string}                                profile.full_name
 * @property {string}                                profile.email
 * @property {string|null}                           profile.avatar_url
 * @property {boolean}                               profile.is_admin
 */

// ─── getCurrentUser ───────────────────────────────────────────────────────────

/**
 * Returns the current session user + their profile row.
 * Returns `null` if there is no valid session.
 *
 * @param {import('next/headers').ReadonlyRequestCookies} cookieStore
 * @returns {Promise<AuthResult|null>}
 */
export async function getCurrentUser(cookieStore) {
  const supabase = createServerSupabaseClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('getCurrentUser: profile fetch error', profileError.message)
    return null
  }

  // Profile row not yet created (e.g. new signup before the DB trigger fires)
  if (!profile) return null

  return { user, profile }
}

// ─── requireAuth ──────────────────────────────────────────────────────────────

/**
 * Returns the current session user + profile, or throws a 401 error object.
 * Catch this in route handlers and return a 401 response.
 *
 * @param {import('next/headers').ReadonlyRequestCookies} cookieStore
 * @returns {Promise<AuthResult>}
 * @throws {{ status: 401, message: string }}
 */
export async function requireAuth(cookieStore) {
  const result = await getCurrentUser(cookieStore)

  if (!result) {
    throw { status: 401, message: 'Unauthorized: no active session' }
  }

  return result
}

// ─── requireAdmin ─────────────────────────────────────────────────────────────

/**
 * Returns the current session user + profile if the user is an admin.
 * Throws a 401 if not authenticated, or a 403 if authenticated but not admin.
 *
 * @param {import('next/headers').ReadonlyRequestCookies} cookieStore
 * @returns {Promise<AuthResult>}
 * @throws {{ status: 401|403, message: string }}
 */
export async function requireAdmin(cookieStore) {
  const result = await requireAuth(cookieStore)

  if (!result.profile.is_admin) {
    throw { status: 403, message: 'Forbidden: admin access required' }
  }

  return result
}

// ─── handleAuthError ──────────────────────────────────────────────────────────

/**
 * Converts a thrown auth error into the correct Next.js Response.
 * Use in the catch block of route handlers.
 *
 * @param {unknown} err - The caught error (may be an auth error object or a raw Error)
 * @returns {Response}
 *
 * @example
 * try {
 *   const { user } = await requireAdmin(cookieStore)
 * } catch (err) {
 *   return handleAuthError(err)
 * }
 */
export function handleAuthError(err) {
  if (err && typeof err === 'object' && 'status' in err) {
    return Response.json(
      { error: err.message },
      { status: err.status }
    )
  }
  // Unexpected error — don't leak details
  console.error('Unexpected auth error:', err)
  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
