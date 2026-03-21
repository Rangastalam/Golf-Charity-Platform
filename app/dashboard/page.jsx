/**
 * @fileoverview Main dashboard overview page — server component.
 *
 * Fetches four summary stats + recent activity in parallel, then renders:
 *   - Personalised greeting with user's first name
 *   - Four StatsCards: scores logged, draw entries, charity contribution, winnings
 *   - Recent activity feed (last 10 events across all activity types)
 *
 * All data is fetched server-side; client components handle animation only.
 */

import { cookies }  from 'next/headers'
import Link         from 'next/link'

import { getCurrentUser }         from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import StatsCard                  from '@/components/dashboard/StatsCard'
import ActivityFeed               from '@/components/dashboard/ActivityFeed'
import { ROUTES }                 from '@/constants'

// ─── Data helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the total number of scores the user has submitted.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function fetchScoreCount(supabase, userId) {
  const { count } = await supabase
    .from('scores')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count ?? 0
}

/**
 * Returns total draw entries this calendar month.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function fetchMonthlyEntries(supabase, userId) {
  const now       = new Date()
  const monthStr  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { count } = await supabase
    .from('draw_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('month', monthStr)

  return count ?? 0
}

/**
 * Returns the user's current charity selection with name + percentage.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<{charityName: string, percentage: number}|null>}
 */
async function fetchCharitySelection(supabase, userId) {
  const { data } = await supabase
    .from('user_charity_selections')
    .select('contribution_percentage, charities(name)')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return null
  return {
    charityName: data.charities?.name ?? 'Unknown',
    percentage:  data.contribution_percentage ?? 0,
  }
}

/**
 * Returns total paid winnings for the user.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function fetchTotalWinnings(supabase, userId) {
  const { data } = await supabase
    .from('winners')
    .select('prize_amount')
    .eq('user_id', userId)
    .eq('payment_status', 'paid')

  if (!data || data.length === 0) return 0
  return data.reduce((sum, row) => sum + (row.prize_amount ?? 0), 0)
}

/**
 * Builds a unified activity array from multiple tables (last 10 events).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<Array<{id: string, type: string, description: string, timestamp: string}>>}
 */
async function fetchRecentActivity(supabase, userId) {
  const [scores, entries, winners, charityChanges, subscriptions] = await Promise.all([
    supabase
      .from('scores')
      .select('id, gross_score, course_name, played_at')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(5),

    supabase
      .from('draw_entries')
      .select('id, month, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('winners')
      .select('id, match_type, prize_amount, created_at, draws(month)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3),

    supabase
      .from('user_charity_selections')
      .select('id, updated_at, charities(name)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(3),

    supabase
      .from('subscriptions')
      .select('id, status, created_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(2),
  ])

  const events = []

  for (const row of scores.data ?? []) {
    events.push({
      id:          `score-${row.id}`,
      type:        'score_added',
      description: `Score of ${row.gross_score} added${row.course_name ? ` at ${row.course_name}` : ''}`,
      timestamp:   row.played_at,
    })
  }

  for (const row of entries.data ?? []) {
    events.push({
      id:          `entry-${row.id}`,
      type:        'draw_entered',
      description: `Entered the ${row.month} monthly draw`,
      timestamp:   row.created_at,
    })
  }

  for (const row of winners.data ?? []) {
    const match = row.match_type?.replace('_match', ' number match') ?? 'prize'
    events.push({
      id:          `winner-${row.id}`,
      type:        'draw_won',
      description: `Won a ${match} in the ${row.draws?.month ?? ''} draw — ₹${(row.prize_amount ?? 0).toLocaleString('en-IN')}`,
      timestamp:   row.created_at,
    })
  }

  for (const row of charityChanges.data ?? []) {
    events.push({
      id:          `charity-${row.id}`,
      type:        'charity_changed',
      description: `Charity updated to ${row.charities?.name ?? 'a new charity'}`,
      timestamp:   row.updated_at,
    })
  }

  for (const row of subscriptions.data ?? []) {
    events.push({
      id:          `sub-${row.id}`,
      type:        'subscription_renewed',
      description: 'Subscription activated',
      timestamp:   row.created_at,
    })
  }

  return events
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const metadata = { title: 'Dashboard — GolfGives' }

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const auth        = await getCurrentUser(cookieStore)

  if (!auth) return null // layout will redirect

  const { user, profile } = auth
  const supabase           = createServerSupabaseClient(cookieStore)

  const [scoreCount, monthlyEntries, charitySelection, totalWinnings, activities] =
    await Promise.all([
      fetchScoreCount(supabase, user.id),
      fetchMonthlyEntries(supabase, user.id),
      fetchCharitySelection(supabase, user.id),
      fetchTotalWinnings(supabase, user.id),
      fetchRecentActivity(supabase, user.id),
    ])

  const firstName = (profile.full_name || profile.email).split(/[\s@]/)[0]

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl">
      {/* Greeting */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-gray-900">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-xs md:text-sm text-gray-500 mt-1">
          Here's what's happening with your GolfGives account.
        </p>
      </div>

      {/* Stats grid — 1 col mobile, 2 col sm, 4 col lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatsCard
          title="Scores Logged"
          value={scoreCount}
          subtitle={scoreCount === 1 ? '1 round recorded' : `${scoreCount} rounds recorded`}
          icon="⛳"
          accent="bg-green-50"
          linkTo={`${ROUTES.DASHBOARD}/scores`}
          linkLabel="View scores →"
        />

        <StatsCard
          title="This Month's Entries"
          value={monthlyEntries}
          subtitle={monthlyEntries === 0 ? 'No entries yet' : `${monthlyEntries} draw ${monthlyEntries === 1 ? 'entry' : 'entries'}`}
          icon="🎟️"
          accent="bg-purple-50"
          linkTo={`${ROUTES.DASHBOARD}/draws`}
          linkLabel="Enter draw →"
        />

        <StatsCard
          title="Supporting"
          value={charitySelection ? charitySelection.charityName : '—'}
          subtitle={charitySelection ? `${charitySelection.percentage}% of subscription` : 'No charity selected'}
          icon="❤️"
          accent="bg-pink-50"
          linkTo={`${ROUTES.DASHBOARD}/charity`}
          linkLabel={charitySelection ? 'Change →' : 'Choose →'}
        />

        <StatsCard
          title="Total Winnings"
          value={totalWinnings > 0 ? `₹${totalWinnings.toLocaleString('en-IN')}` : '₹0'}
          subtitle={totalWinnings > 0 ? 'Paid to date' : 'No wins yet — keep playing!'}
          icon="🏆"
          accent="bg-amber-50"
          linkTo={`${ROUTES.DASHBOARD}/winnings`}
          linkLabel="View winnings →"
        />
      </div>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="text-sm md:text-base font-bold text-gray-900">Recent Activity</h2>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
          <ActivityFeed activities={activities} />
        </div>
      </section>

      {/* Quick actions — stacked on mobile, 3-col on sm+ */}
      <section>
        <h2 className="text-sm md:text-base font-bold text-gray-900 mb-3 md:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href={`${ROUTES.DASHBOARD}/scores`}
            className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 md:px-5 py-4 min-h-[56px] hover:border-green-300 hover:shadow-sm transition-all group"
          >
            <span className="text-2xl">⛳</span>
            <div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-green-800">
                Log a Score
              </p>
              <p className="text-xs text-gray-400">Record today's round</p>
            </div>
          </Link>

          <Link
            href={`${ROUTES.DASHBOARD}/draws`}
            className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 md:px-5 py-4 min-h-[56px] hover:border-purple-300 hover:shadow-sm transition-all group"
          >
            <span className="text-2xl">🎟️</span>
            <div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-purple-800">
                Enter Draw
              </p>
              <p className="text-xs text-gray-400">This month's prize draw</p>
            </div>
          </Link>

          <Link
            href={`${ROUTES.DASHBOARD}/charity`}
            className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 md:px-5 py-4 min-h-[56px] hover:border-pink-300 hover:shadow-sm transition-all group"
          >
            <span className="text-2xl">❤️</span>
            <div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-pink-800">
                My Charity
              </p>
              <p className="text-xs text-gray-400">Manage your contribution</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  )
}
