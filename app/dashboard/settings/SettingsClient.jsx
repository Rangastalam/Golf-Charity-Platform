/**
 * @fileoverview Interactive settings forms — client component.
 *
 * Renders sections for Profile, Subscription, Password, and Danger Zone.
 * Each section submits to the appropriate API endpoint independently.
 *
 * @param {{
 *   profile: {
 *     id: string,
 *     fullName: string,
 *     email: string,
 *     avatarUrl: string|null
 *   },
 *   subscription: {
 *     id: string,
 *     plan: string,
 *     status: string,
 *     periodEndDate: string|null,
 *     cancelledAt: string|null,
 *     planDetails: object|null,
 *     hasStripe: boolean
 *   }|null,
 *   isOAuthUser: boolean
 * }} props
 */

'use client'

import { useState }           from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter }          from 'next/navigation'
import { useToast }           from '@/components/shared/Toast'
import { supabase }           from '@/lib/supabase'

// ─── Shared form primitives ───────────────────────────────────────────────────

/**
 * @param {{ label: string, id: string } & React.InputHTMLAttributes<HTMLInputElement>} props
 */
function Field({ label, id, ...inputProps }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition min-h-[44px]"
        {...inputProps}
      />
    </div>
  )
}

/**
 * @param {{ success?: boolean, error?: string|null }} props
 */
function FormFeedback({ success, error }) {
  return (
    <AnimatePresence>
      {(success || error) && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={[
            'text-sm rounded-xl px-4 py-3',
            success
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-600 border border-red-200',
          ].join(' ')}
        >
          {success ? '✓ Saved successfully.' : error}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection({ profile }) {
  const toast                     = useToast()
  const [fullName,  setFullName]  = useState(profile.fullName ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '')
  const [saving,    setSaving]    = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [error,     setError]     = useState(null)
  const router                    = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    setError(null)

    try {
      const res  = await fetch('/api/user/profile', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          full_name:  fullName.trim(),
          avatar_url: avatarUrl.trim() || null,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        const message = json.error ?? 'Failed to save profile.'
        setError(message)
        toast.error(message)
      } else {
        setSuccess(true)
        toast.success('Settings saved!')
        router.refresh()
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch {
      const message = 'Network error. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 space-y-4">
      <h2 className="text-sm md:text-base font-bold text-gray-900">Profile</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Display Name"
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your name"
          maxLength={80}
        />

        <Field
          label="Email"
          id="email"
          type="email"
          value={profile.email}
          disabled
          className="bg-gray-50 cursor-not-allowed opacity-70"
        />

        <Field
          label="Avatar URL (optional)"
          id="avatarUrl"
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/avatar.jpg"
        />

        <FormFeedback success={success} error={error} />

        <button
          type="submit"
          disabled={saving}
          className="w-full md:w-auto bg-green-800 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-green-900 transition-colors disabled:opacity-50 min-h-[44px]"
        >
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </section>
  )
}

// ─── Subscription section ─────────────────────────────────────────────────────

function SubscriptionSection({ subscription }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function openBillingPortal() {
    setLoading(true)
    setError(null)

    try {
      const res  = await fetch('/api/subscriptions/portal', { method: 'POST' })
      const json = await res.json()

      if (!res.ok || !json.url) {
        setError(json.error ?? 'Could not open billing portal.')
        return
      }

      window.location.href = json.url
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!subscription) {
    return (
      <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
        <h2 className="text-sm md:text-base font-bold text-gray-900 mb-3">Subscription</h2>
        <p className="text-sm text-gray-500">You don't have an active subscription.</p>
        <a
          href="/pricing"
          className="inline-flex mt-3 items-center gap-1.5 bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-900 transition-colors min-h-[44px]"
        >
          View Plans
        </a>
      </section>
    )
  }

  const statusMap = {
    active:    { cls: 'bg-green-100 text-green-700', label: 'Active' },
    lapsed:    { cls: 'bg-red-100 text-red-700',     label: 'Lapsed' },
    inactive:  { cls: 'bg-gray-100 text-gray-600',   label: 'Inactive' },
    cancelled: { cls: 'bg-gray-100 text-gray-600',   label: 'Cancelled' },
  }
  const { cls, label } = statusMap[subscription.status] ?? statusMap.inactive

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 space-y-4">
      <h2 className="text-sm md:text-base font-bold text-gray-900">Subscription</h2>

      <div className="flex items-start md:items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {subscription.planDetails?.name ?? subscription.plan ?? 'Plan'}
            {' '}· {subscription.planDetails?.priceDisplay ?? ''}
          </p>
          {subscription.periodEndDate && (
            <p className="text-xs text-gray-400 mt-0.5">
              {subscription.cancelledAt
                ? `Cancels on ${subscription.periodEndDate}`
                : `Renews on ${subscription.periodEndDate}`}
            </p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${cls}`}>
          {label}
        </span>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {subscription.hasStripe && (
        <button
          onClick={openBillingPortal}
          disabled={loading}
          className="w-full border border-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl hover:border-green-300 hover:text-green-800 transition-colors disabled:opacity-50 min-h-[44px]"
        >
          {loading ? 'Opening portal…' : 'Manage Billing & Invoices →'}
        </button>
      )}
    </section>
  )
}

// ─── Password section ─────────────────────────────────────────────────────────

/**
 * @param {{ email: string }} props
 */
function PasswordSection({ email }) {
  const toast                   = useToast()
  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (next.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (!/\d/.test(next)) {
      setError('New password must contain at least one number.')
      return
    }
    if (next !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    try {
      // ── Step 1: verify current password ──────────────────────────────────
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      })

      if (signInError) {
        const message = 'Current password is incorrect.'
        setError(message)
        toast.error(message)
        return
      }

      // ── Step 2: update to the new password ────────────────────────────────
      const { error: updateError } = await supabase.auth.updateUser({ password: next })

      if (updateError) {
        const message = updateError.message ?? 'Failed to update password.'
        setError(message)
        toast.error(message)
        return
      }

      setSuccess(true)
      toast.success('Password updated successfully!')
      setCurrent('')
      setNext('')
      setConfirm('')
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      const message = 'Network error. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 space-y-4">
      <h2 className="text-sm md:text-base font-bold text-gray-900">Change Password</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Current Password"
          id="current"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          required
        />
        <Field
          label="New Password"
          id="new"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Field
          label="Confirm New Password"
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />

        <FormFeedback success={success} error={error} />

        <button
          type="submit"
          disabled={saving || !current || !next || !confirm}
          className="w-full md:w-auto bg-green-800 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-green-900 transition-colors disabled:opacity-50 min-h-[44px]"
        >
          {saving ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </section>
  )
}

// ─── Danger zone ──────────────────────────────────────────────────────────────

function DangerZone() {
  const [confirm,   setConfirm]   = useState('')
  const [deleting,  setDeleting]  = useState(false)
  const [showForm,  setShowForm]  = useState(false)
  const [error,     setError]     = useState(null)
  const router                    = useRouter()

  const CONFIRMATION_PHRASE = 'DELETE MY ACCOUNT'

  async function handleDelete(e) {
    e.preventDefault()
    if (confirm !== CONFIRMATION_PHRASE) return

    setDeleting(true)
    setError(null)

    try {
      const res  = await fetch('/api/user/delete', { method: 'DELETE' })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Failed to delete account.')
        return
      }

      router.push('/')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-red-100 p-4 md:p-6 space-y-4">
      <h2 className="text-sm md:text-base font-bold text-red-700">Danger Zone</h2>
      <p className="text-xs md:text-sm text-gray-500">
        Deleting your account is permanent and cannot be undone. All your scores, draw
        entries, and charity preferences will be removed.
      </p>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full md:w-auto border border-red-300 text-red-600 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-red-50 transition-colors min-h-[44px]"
        >
          Delete My Account
        </button>
      ) : (
        <form onSubmit={handleDelete} className="space-y-4">
          <p className="text-sm font-semibold text-gray-700">
            Type <span className="font-black text-red-600">{CONFIRMATION_PHRASE}</span> to confirm:
          </p>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-red-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 min-h-[44px]"
            placeholder={CONFIRMATION_PHRASE}
            autoComplete="off"
          />

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-red-600"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => { setShowForm(false); setConfirm(''); setError(null) }}
              className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={confirm !== CONFIRMATION_PHRASE || deleting}
              className="flex-1 bg-red-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
            >
              {deleting ? 'Deleting…' : 'Confirm Delete'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

/**
 * @param {{ profile: object, subscription: object|null, isOAuthUser: boolean }} props
 */
export default function SettingsClient({ profile, subscription, isOAuthUser }) {
  return (
    <div className="space-y-4 md:space-y-6">
      <ProfileSection profile={profile} />
      <SubscriptionSection subscription={subscription} />
      {!isOAuthUser && <PasswordSection email={profile.email} />}
      <DangerZone />
    </div>
  )
}
