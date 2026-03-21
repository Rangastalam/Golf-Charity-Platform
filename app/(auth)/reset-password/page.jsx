/**
 * @fileoverview Reset password page.
 *
 * Supabase sends the user here after they click the email link:
 *   /reset-password#access_token=xxx&refresh_token=yyy&type=recovery
 *
 * On mount, the access_token is extracted from the URL hash and used to
 * establish a session via supabase.auth.setSession(). The form is only
 * shown once the session is confirmed.
 *
 * Validation rules:
 *   - Min 8 characters
 *   - At least one number
 *   - Passwords must match
 */

'use client'

import { useState, useEffect }     from 'react'
import { useRouter }               from 'next/navigation'
import Link                        from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase }                from '@/lib/supabase'
import { useToast }                from '@/components/shared/Toast'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validate a proposed password.
 * @param {string} password
 * @param {string} confirm
 * @returns {string|null} error message or null if valid
 */
function validatePasswords(password, confirm) {
  if (password.length < 8)      return 'Password must be at least 8 characters.'
  if (!/\d/.test(password))     return 'Password must contain at least one number.'
  if (password !== confirm)     return 'Passwords do not match.'
  return null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const router = useRouter()
  const toast  = useToast()

  /**
   * tokenState:
   *   'loading' — waiting to verify the access_token from the URL hash
   *   'ready'   — session established, show the form
   *   'invalid' — no token in hash, or setSession() failed
   */
  const [tokenState, setTokenState] = useState('loading')

  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  // ── Extract token from URL hash and set session ──────────────────────────
  useEffect(() => {
    const hash   = window.location.hash.slice(1)        // strip leading #
    const params = new URLSearchParams(hash)
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token') ?? ''
    const type         = params.get('type')

    if (!accessToken || type !== 'recovery') {
      setTokenState('invalid')
      return
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          console.error('[reset-password] setSession error:', sessionError)
          setTokenState('invalid')
        } else {
          setTokenState('ready')
        }
      })
  }, [])

  // ── Submit ─────────────────────────────────────────────────────────────────
  /** @param {React.FormEvent<HTMLFormElement>} e */
  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const validationError = validatePasswords(password, confirm)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        const message = updateError.message ?? 'Failed to update password.'
        setError(message)
        toast.error(message)
        return
      }

      setDone(true)
      toast.success('Password updated! Redirecting…')
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err) {
      const message = err.message ?? 'Something went wrong. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* ── Loading state ── */}
      {tokenState === 'loading' && (
        <div className="flex flex-col items-center py-12 gap-3">
          <span className="h-7 w-7 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">Verifying reset link…</p>
        </div>
      )}

      {/* ── Invalid / expired token ── */}
      {tokenState === 'invalid' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-5"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div>
            <h1 className="text-xl font-bold text-gray-900">Invalid or expired link</h1>
            <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">
              This password reset link is invalid or has expired.
              Please request a new one.
            </p>
          </div>

          <Link
            href="/forgot-password"
            className="
              inline-flex items-center justify-center gap-2
              rounded-lg bg-green-700 hover:bg-green-800
              px-5 py-2.5 text-sm font-semibold text-white
              transition-colors min-h-[44px]
            "
          >
            Request new link
          </Link>
        </motion.div>
      )}

      {/* ── Form / done ── */}
      {tokenState === 'ready' && (
        <AnimatePresence mode="wait">
          {/* ── Success state ── */}
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-center space-y-5"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Password updated!</h1>
              <p className="text-sm text-gray-500">Redirecting you to your dashboard…</p>
              <span className="inline-block h-5 w-5 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
            </motion.div>
          ) : (
            // ── Password form ──
            <motion.div key="form">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Set new password
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                Choose a strong password — at least 8 characters with one number.
              </p>

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* New password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    New password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    placeholder="••••••••"
                    className="
                      w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm
                      text-gray-900 placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent
                      disabled:opacity-50 transition min-h-[44px]
                    "
                  />
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    htmlFor="confirm"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={loading}
                    placeholder="••••••••"
                    className="
                      w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm
                      text-gray-900 placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent
                      disabled:opacity-50 transition min-h-[44px]
                    "
                  />
                </div>

                {/* Inline error */}
                {error && (
                  <motion.div
                    role="alert"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    w-full flex items-center justify-center gap-2
                    rounded-lg bg-green-700 hover:bg-green-800
                    px-4 py-2.5 text-sm font-semibold text-white
                    transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]
                  "
                >
                  {loading && (
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  )}
                  {loading ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  )
}
