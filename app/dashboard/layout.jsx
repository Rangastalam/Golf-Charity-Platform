/**
 * @fileoverview Dashboard layout — server component.
 *
 * Fetches the authenticated user's profile and subscription status, then
 * passes them as props into the client-side DashboardShell for rendering
 * the sidebar, mobile header, and bottom navigation.
 *
 * Redirects to /login if there is no active session.
 */

import { redirect } from 'next/navigation'
import { cookies }  from 'next/headers'

import { getCurrentUser }         from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import DashboardShell             from '@/components/dashboard/DashboardShell'
import { ROUTES }                 from '@/constants'

/**
 * Fetches the user's most-recent subscription status string.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
async function getSubscriptionStatus(supabase, userId) {
  const { data } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .order('status',     { ascending: true  }) // 'active' sorts before others alphabetically
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.status ?? null
}

/**
 * @param {{ children: React.ReactNode }} props
 */
export default async function DashboardLayout({ children }) {
  const cookieStore = await cookies()
  const auth        = await getCurrentUser(cookieStore)

  if (!auth) {
    redirect(ROUTES.LOGIN)
  }

  const { user, profile } = auth

  const supabase           = createServerSupabaseClient(cookieStore)
  const subscriptionStatus = await getSubscriptionStatus(supabase, user.id)

  /** Normalised user shape consumed by DashboardShell */
  const shellUser = {
    id:          profile.id,
    email:       profile.email,
    displayName: profile.full_name || profile.email.split('@')[0],
    avatarUrl:   profile.avatar_url ?? null,
  }

  return (
    <DashboardShell user={shellUser} subscriptionStatus={subscriptionStatus}>
      {children}
    </DashboardShell>
  )
}
