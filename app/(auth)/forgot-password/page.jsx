/**
 * @fileoverview Forgot password page.
 *
 * Submits the user's email to /api/auth/reset-password.
 * Always shows a success state after submission regardless of
 * whether the email exists (avoids account enumeration).
 *
 * Supabase Dashboard setup required:
 *   Authentication → URL Configuration → Redirect URLs:
 *     http://localhost:3000/reset-password
 *     https://<your-vercel-url>.vercel.app/reset-password
 *   Site URL: http://localhost:3000
 */

'use client'

import { useState }            from 'react'
import Link                    from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast }            from '@/components/shared/Toast'

/** Basic email format check — real validation is server-side. */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export default function ForgotPasswordPage() {
  const toast = useToast()

  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState(null)

  /** @param {React.FormEvent<HTMLFormElement>} e */
  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Email address is required.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error ?? 'Failed to send reset link.')
      }

      setSent(true)
    } catch (err) {
      const message = err.message ?? 'Something went wrong. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <AnimatePresence mode="wait">
        {/* ── Success state ── */}
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="text-center space-y-5"
          >
            {/* Email icon */}
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
                  strokeWidth={1.75}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                We've sent a password reset link to{' '}
                <span className="font-semibold text-gray-700">{email}</span>.
                <br />
                Follow the link in the email to reset your password.
              </p>
            </div>

            <p className="text-xs text-gray-400">
              Didn't receive it? Check your spam folder or{' '}
              <button
                type="button"
                onClick={() => { setSent(false); setError(null) }}
                className="font-medium text-green-700 hover:text-green-800 underline"
              >
                try again
              </button>
              .
            </p>

            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to login
            </Link>
          </motion.div>
        ) : (
          // ── Form state ──
          <motion.div key="form">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Forgot your password?
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              Enter your email and we'll send you a link to reset it.
            </p>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="you@example.com"
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
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Remember your password?{' '}
              <Link
                href="/login"
                className="font-medium text-green-700 hover:text-green-800"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
