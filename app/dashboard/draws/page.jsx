/**
 * @fileoverview Dashboard draw participation page — server component.
 *
 * Displays:
 *   - Current month's draw status with an entry CTA (subscription-gated)
 *   - Past draw history with the user's results
 *   - How scores map to draw entries explanation
 *
 * Entry action is delegated to a client component for interactive submission.
 */

import { cookies } from 'next/headers'
import Link        from 'next/link'

import { getCurrentUser }         from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import DrawEntryClient            from './DrawEntryClient'
import { ROUTES }                 from '@/constants'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** @returns {string} e.g. "2026-03" */
function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * @param {string} monthStr  e.g. "2026-03"
 * @returns {string}         e.g. "March 2026"
 */
function formatMonth(monthStr) {
  const [year, month] = monthStr.split('-')
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const metadata = { title: 'Draw & Prizes — GolfGives' }

export default async function DrawsPage() {
  const cookieStore = await cookies()
  const auth        = await getCurrentUser(cookieStore)

  if (!auth) return null

  const { user } = auth
  const supabase  = createServerSupabaseClient(cookieStore)
  const month     = currentMonthStr()

  const [subscriptionResult, currentEntryResult, scoresResult, pastDrawsResult] =
    await Promise.all([
      // Active subscription?
      supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .order('status',     { ascending: true  })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Already entered this month?
      supabase
        .from('draw_entries')
        .select('id, created_at, scores_snapshot')
        .eq('user_id', user.id)
        .eq('month', month)
        .maybeSingle(),

      // User's recent scores (for eligibility display)
      supabase
        .from('scores')
        .select('id, gross_score, course_name, played_at')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(5),

      // Past 12 draws the user entered
      supabase
        .from('draw_entries')
        .select(`
          id,
          month,
          created_at,
          draws(
            id,
            status,
            drawn_numbers,
            prize_pools(total_pool, five_match_pool, four_match_pool, three_match_pool),
            winners(match_type, prize_amount, payment_status)
          )
        `)
        .eq('user_id', user.id)
        .neq('month', month)
        .order('created_at', { ascending: false })
        .limit(12),
    ])

  const isSubscribed  = subscriptionResult.data?.status === 'active'
  const currentEntry  = currentEntryResult.data
  const recentScores  = scoresResult.data ?? []
  const pastEntries   = pastDrawsResult.data ?? []
  const hasMinScores  = recentScores.length >= 3

  return (
    <div className="space-y-6 md:space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-gray-900">Draw & Prizes</h1>
        <p className="text-xs md:text-sm text-gray-500 mt-1">
          Match your Stableford scores to the monthly drawn numbers and win prizes.
        </p>
      </div>

      {/* Current month card */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm md:text-base font-bold text-gray-900">
              {formatMonth(month)} Draw
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Draw runs on the 28th of each month
            </p>
          </div>
          <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex-shrink-0">
            Open
          </span>
        </div>

        {!isSubscribed ? (
          <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
            <p className="text-2xl mb-2">🔒</p>
            <p className="text-sm font-semibold text-gray-700">Subscription required</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Subscribe to enter monthly prize draws.
            </p>
            <Link
              href={ROUTES.PRICING}
              className="inline-flex items-center gap-1.5 bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-900 transition-colors min-h-[44px]"
            >
              View Plans
            </Link>
          </div>
        ) : (
          <DrawEntryClient
            userId={user.id}
            month={month}
            currentEntry={currentEntry}
            recentScores={recentScores}
            hasMinScores={hasMinScores}
          />
        )}
      </section>

      {/* How it works */}
      <section className="bg-green-950 rounded-2xl p-4 md:p-6 text-white">
        <h2 className="text-xs md:text-sm font-bold mb-4 text-green-300 uppercase tracking-wider">
          How the draw works
        </h2>
        <ol className="space-y-3">
          {[
            { n: '1', text: 'Log at least 3 Stableford scores during the month.' },
            { n: '2', text: 'Enter the draw before the 28th — your 5 best scores are snapshotted.' },
            { n: '3', text: 'On the 28th, 5 numbers are drawn from 1–45.' },
            { n: '4', text: 'Match 3, 4, or all 5 numbers to win a share of the prize pool.' },
          ].map(({ n, text }) => (
            <li key={n} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-green-800 text-green-200 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                {n}
              </span>
              <p className="text-xs md:text-sm text-green-100">{text}</p>
            </li>
          ))}
        </ol>

        {/* Prize tier cards — always 3 col, text wraps */}
        <div className="mt-5 grid grid-cols-3 gap-2 md:gap-3 pt-4 border-t border-green-900">
          {[
            { label: '5 numbers', prize: '60% of pool', color: 'text-yellow-400' },
            { label: '4 numbers', prize: '30% of pool', color: 'text-green-300'  },
            { label: '3 numbers', prize: '10% of pool', color: 'text-blue-300'   },
          ].map(({ label, prize, color }) => (
            <div key={label} className="text-center">
              <p className={`text-xs md:text-sm font-black ${color}`}>{label}</p>
              <p className="text-[10px] md:text-xs text-green-400 mt-0.5">{prize}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Past draw history */}
      {pastEntries.length > 0 && (
        <section>
          <h2 className="text-sm md:text-base font-bold text-gray-900 mb-4">Past Draw History</h2>
          <div className="space-y-3">
            {pastEntries.map((entry) => {
              const draw        = entry.draws
              const isPublished = draw?.status === 'published'
              const myWinner    = draw?.winners?.find((w) => w)
              const drawnNums   = draw?.drawn_numbers ?? []

              return (
                <div
                  key={entry.id}
                  className="bg-white border border-gray-100 rounded-2xl px-4 md:px-5 py-4 flex items-start md:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatMonth(entry.month)}
                    </p>
                    {isPublished && drawnNums.length > 0 ? (
                      <p className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-1">
                        <span>Numbers:</span>
                        <span className="font-semibold text-gray-700">
                          {drawnNums.join(', ')}
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {draw?.status === 'configured' ? 'Draw pending' : 'Awaiting results'}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    {myWinner ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                        🏆 Won{' '}
                        {myWinner.prize_amount
                          ? `₹${myWinner.prize_amount.toLocaleString('en-IN')}`
                          : ''}
                      </span>
                    ) : isPublished ? (
                      <span className="text-xs text-gray-400">No match</span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
