/**
 * @fileoverview Admin overview page — server component.
 *
 * Fetches four key metrics + recent signups + cancellations server-side.
 * Passes data to client for Framer Motion card stagger.
 */

import { cookies }       from 'next/headers'
import Link              from 'next/link'
import { requireAdmin }  from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import AdminMetricCards  from './AdminMetricCards'

export const metadata = { title: 'Admin Overview — GolfGives' }

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function fetchMetrics() {
  const now       = new Date()
  const monthStr  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthStart = `${monthStr}-01`

  const [activeSubsRes, prizePoolRes, charityRes, pendingWinnersRes] = await Promise.all([
    supabaseAdmin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),

    supabaseAdmin
      .from('prize_pools')
      .select('total_pool')
      .gte('created_at', monthStart),

    supabaseAdmin
      .from('charity_contributions')
      .select('amount')
      .gte('created_at', monthStart),

    supabaseAdmin
      .from('winners')
      .select('id', { count: 'exact', head: true })
      .eq('payment_status', 'pending'),
  ])

  const totalPrizePool = (prizePoolRes.data ?? []).reduce(
    (s, r) => s + Number(r.total_pool ?? 0), 0
  )
  const totalCharity = (charityRes.data ?? []).reduce(
    (s, r) => s + Number(r.amount ?? 0), 0
  )

  return {
    activeSubscribers:      activeSubsRes.count ?? 0,
    monthlyPrizePool:       totalPrizePool,
    monthlyCharityTotal:    totalCharity,
    pendingVerifications:   pendingWinnersRes.count ?? 0,
  }
}

async function fetchRecentActivity() {
  const [signupsRes, cancellationsRes] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(10),

    supabaseAdmin
      .from('subscriptions')
      .select('user_id, plan, created_at, profiles(full_name, email)')
      .eq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return {
    recentSignups:        signupsRes.data ?? [],
    recentCancellations:  cancellationsRes.data ?? [],
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminOverviewPage() {
  const cookieStore = await cookies()
  await requireAdmin(cookieStore).catch(() => null)

  const [metrics, activity] = await Promise.all([
    fetchMetrics(),
    fetchRecentActivity(),
  ])

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-gray-900">Admin Overview</h1>
        <p className="text-xs md:text-sm text-gray-500 mt-1">
          Platform health at a glance.
        </p>
      </div>

      {/* Metric cards — animated client component */}
      <AdminMetricCards metrics={metrics} />

      {/* Quick actions */}
      <section>
        <h2 className="text-sm md:text-base font-bold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: '/admin/draws',           label: 'Run This Month\'s Draw', icon: '🎰', color: 'border-purple-200 hover:border-purple-400' },
            { href: '/admin/winners',         label: 'Verify Pending Winners', icon: '✅', color: 'border-amber-200  hover:border-amber-400'  },
            { href: '/admin/charities/new',   label: 'Add New Charity',        icon: '❤️', color: 'border-pink-200   hover:border-pink-400'   },
          ].map(({ href, label, icon, color }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 bg-white border rounded-2xl px-4 py-4 min-h-[56px] hover:shadow-sm transition-all group ${color}`}
            >
              <span className="text-2xl">{icon}</span>
              <p className="text-sm font-semibold text-gray-900">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent signups */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm md:text-base font-bold text-gray-900">Recent Signups</h2>
            <Link href="/admin/users" className="text-xs font-semibold text-red-700 hover:text-red-900">
              View all →
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {activity.recentSignups.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No signups yet.</p>
            ) : (
              activity.recentSignups.map((user) => (
                <Link
                  key={user.id}
                  href={`/admin/users/${user.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user.full_name || user.email}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0 ml-3">
                    {new Date(user.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short',
                    })}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Recent cancellations */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm md:text-base font-bold text-gray-900">Recent Cancellations</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {activity.recentCancellations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No cancellations.</p>
            ) : (
              activity.recentCancellations.map((sub, i) => (
                <Link
                  key={`${sub.user_id}-${i}`}
                  href={`/admin/users/${sub.user_id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {sub.profiles?.full_name || sub.profiles?.email || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{sub.plan} plan</p>
                  </div>
                  <p className="text-xs text-red-400 flex-shrink-0 ml-3">
                    {new Date(sub.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short',
                    })}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
