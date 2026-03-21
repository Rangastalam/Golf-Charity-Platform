'use client'

/**
 * @fileoverview Login page.
 * Email + password sign-in via Supabase Auth with Framer Motion fade-in.
 * Uses toast for API-level errors; inline display for validation errors.
 */

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/shared/Toast'

/** Simple email format check — full validation is server-side. */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirectTo') ?? '/dashboard'
  const toast        = useToast()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  /** @param {React.FormEvent<HTMLFormElement>} e */
  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    // ── Client-side validation ──────────────────────────────────────────────
    if (!email.trim()) {
      setError('Email address is required.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!password) {
      setError('Password is required.')
      return
    }

    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password,
      })

      if (signInError) {
        let message
        if (signInError.message.includes('Invalid login credentials')) {
          message = 'Incorrect email or password. Please try again.'
        } else if (signInError.message.includes('Email not confirmed')) {
          message = 'Please confirm your email address before signing in.'
        } else {
          message = signInError.message
        }
        setError(message)
        toast.error(message)
        return
      }

      router.push(redirectTo.startsWith('/') ? redirectTo : '/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Login error:', err)
      const message = 'An unexpected error occurred. Please try again.'
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
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
      <p className="text-gray-500 text-sm mb-6">Sign in to your GolfGives account.</p>

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
              disabled:opacity-50 transition
            "
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-green-700 hover:text-green-800 font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        {/* Inline validation error */}
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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="font-medium text-green-700 hover:text-green-800"
        >
          Sign up free
        </Link>
      </p>
    </motion.div>
  )
}
