'use client'

/**
 * @fileoverview Signup page.
 * Creates a Supabase auth user, upserts the profiles row, then redirects
 * to /dashboard/onboarding for charity selection and plan setup.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/shared/Toast'

/** @param {string} email */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export default function SignupPage() {
  const router = useRouter()
  const toast  = useToast()

  const [fullName,        setFullName]        = useState('')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error,           setError]           = useState(null)
  const [loading,         setLoading]         = useState(false)
  const [awaitingEmail,   setAwaitingEmail]   = useState(false)

  /** @param {React.FormEvent<HTMLFormElement>} e */
  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    // ── Client-side validation ──────────────────────────────────────────────
    if (!fullName.trim()) {
      setError('Full name is required.')
      return
    }
    if (!email.trim() || !isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      // ── Step 1: Create the Supabase auth user ─────────────────────────────
      const { data, error: signUpError } = await supabase.auth.signUp({
        email:    email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name:    fullName.trim(),
            display_name: fullName.trim(),  // trigger reads either key
          },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (signUpError) {
        const message = signUpError.message.includes('already registered')
          ? 'An account with this email already exists. Try signing in.'
          : signUpError.message
        setError(message)
        toast.error(message)
        return
      }

      // ── Step 2: Upsert the profiles row ───────────────────────────────────
      // The on_auth_user_created trigger also does this, but an explicit
      // upsert ensures the row exists immediately and full_name is populated.
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id:        data.user.id,
            full_name: fullName.trim(),
            email:     email.trim().toLowerCase(),
          },
          { onConflict: 'id' }
        )

        if (profileError) {
          // Non-fatal: the trigger will have created the row; log and continue.
          console.warn('Signup: profile upsert warning:', profileError.message)
        }
      }

      // ── Step 3: Fire welcome email (non-blocking) ─────────────────────────
      if (data.user) {
        fetch('/api/auth/welcome', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ userId: data.user.id }),
        }).catch(() => null)
      }

      // ── Step 4: Redirect or show email-confirmation state ─────────────────
      if (data.session) {
        toast.success('Account created! Welcome to GolfGives.')
        router.push('/dashboard/onboarding')
        router.refresh()
      } else {
        toast.info('Check your email to confirm your account.')
        setAwaitingEmail(true)
      }
    } catch (err) {
      console.error('Signup error:', err)
      const message = 'An unexpected error occurred. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  // ── Email-confirmation waiting state ────────────────────────────────────────
  if (awaitingEmail) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center py-4"
      >
        <div className="text-5xl mb-4">✉️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          We sent a confirmation link to{' '}
          <span className="font-semibold text-gray-800">{email}</span>.
          <br />
          Click the link to activate your account, then sign in.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-green-700 hover:text-green-900"
        >
          Back to sign in
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
      <p className="text-gray-500 text-sm mb-6">
        Join GolfGives — play golf, support charity, win prizes.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Full name */}
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            placeholder="Tiger Woods"
            className="
              w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm
              text-gray-900 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent
              disabled:opacity-50 transition
            "
          />
        </div>

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
              disabled:opacity-50 transition
            "
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="Min. 8 characters"
            className="
              w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm
              text-gray-900 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent
              disabled:opacity-50 transition
            "
          />
        </div>

        {/* Confirm password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            placeholder="••••••••"
            className="
              w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm
              text-gray-900 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent
              disabled:opacity-50 transition
            "
          />
        </div>

        {/* Error */}
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
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {loading && (
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          )}
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-400">
        By signing up you agree to our{' '}
        <Link href="/terms" className="underline hover:text-gray-600">Terms</Link>
        {' '}and{' '}
        <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
      </p>

      <p className="mt-3 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-green-700 hover:text-green-800"
        >
          Sign in
        </Link>
      </p>
    </motion.div>
  )
}
