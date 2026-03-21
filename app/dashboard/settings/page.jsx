/**
 * @fileoverview Dashboard settings page — server component + client forms.
 *
 * Sections:
 *   1. Profile — display name, avatar URL
 *   2. Subscription — current plan, billing portal link, cancel
 *   3. Password — change password (email auth only)
 *   4. Notifications — placeholder (future webhook)
 *   5. Danger zone — delete account request
 *
 * Form interactions are handled by SettingsClient.
 */

import { cookies } from 'next/headers'

import { getCurrentUser }             from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import SettingsClient                 from './SettingsClient'
import { PLANS }                      from '@/constants'

// ─── Subscription helper ──────────────────────────────────────────────────────

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function fetchSubscription(supabase, userId) {
  const { data } = await supabase
    .from('subscriptions')
    .select('id, plan, status, current_period_end, cancelled_at, stripe_customer_id')
    .eq('user_id', userId)
    .order('status',     { ascending: true  })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ?? null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const metadata = { title: 'Settings — GolfGives' }

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const auth        = await getCurrentUser(cookieStore)

  if (!auth) return null

  const { user, profile } = auth
  const supabase           = createServerSupabaseClient(cookieStore)
  const subscription       = await fetchSubscription(supabase, user.id)

  const planDetails    = subscription?.plan ? PLANS[subscription.plan] ?? null : null
  const periodEndDate  = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  const isOAuthUser = user.app_metadata?.provider !== 'email'

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account preferences and subscription.
        </p>
      </div>

      <SettingsClient
        profile={{
          id:          profile.id,
          fullName:    profile.full_name,
          email:       profile.email,
          avatarUrl:   profile.avatar_url,
        }}
        subscription={
          subscription
            ? {
                id:            subscription.id,
                plan:          subscription.plan,
                status:        subscription.status,
                periodEndDate,
                cancelledAt:   subscription.cancelled_at,
                planDetails,
                hasStripe:     Boolean(subscription.stripe_customer_id),
              }
            : null
        }
        isOAuthUser={isOAuthUser}
      />
    </div>
  )
}
