/**
 * @fileoverview Full scores management page.
 *
 * URL: /dashboard/scores
 *
 * Wrapped in SubscriptionGuard — only active subscribers can access.
 * Fetches the user's current scores server-side for instant hydration.
 */

import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/constants'
import SubscriptionGuard from '@/components/shared/SubscriptionGuard'
import ScoreManager from './ScoreManager'

export const metadata = {
  title: 'Scores',
}

export default async function ScoresPage() {
  const cookieStore = await cookies()
  const supabase = createServerSupabaseClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect(ROUTES.LOGIN)
  }

  // Fetch scores server-side for SSR hydration
  const { data: initialScores } = await supabase
    .from('scores')
    .select('id, score, played_at, created_at')
    .eq('user_id', user.id)
    .order('played_at', { ascending: false })
    .limit(5)

  return (
    <div className="max-w-2xl mx-auto space-y-6 md:space-y-8">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Score tracker</h1>
        <p className="text-gray-500 mt-1 text-xs md:text-sm">
          Log your Stableford scores and track your improvement over time.
        </p>
      </div>

      {/* ── Stableford explainer ─────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 md:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span aria-hidden="true">⛳</span> About Stableford scoring
        </h2>
        <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
          Stableford is a points-based format where you score points per hole
          based on your performance relative to par. A birdie earns 3 points,
          par earns 2 points, a bogey earns 1 point, and double bogey or worse
          scores 0. A typical 18-hole round scores between 20 and 40 points —
          higher is better.
        </p>
        {/* 3-col on mobile (hide two entries), 5-col on sm+ */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs">
          {[
            { label: 'Eagle',     pts: '4', color: 'text-yellow-400' },
            { label: 'Birdie',    pts: '3', color: 'text-green-400'  },
            { label: 'Par',       pts: '2', color: 'text-blue-400'   },
            { label: 'Bogey',     pts: '1', color: 'text-orange-400' },
            { label: 'Dbl bogey+', pts: '0', color: 'text-red-400'  },
          ].map(({ label, pts, color }, i) => (
            <div
              key={label}
              className={[
                'bg-gray-800 rounded-lg p-2',
                // Hide Eagle and Birdie columns on very small screens to avoid overflow
                i < 2 ? 'hidden sm:block' : '',
              ].join(' ')}
            >
              <p className={`text-base md:text-lg font-bold ${color}`}>{pts}</p>
              <p className="text-gray-500 text-[10px] md:text-xs">{label}</p>
            </div>
          ))}
          {/* Mobile-only: show Eagle + Birdie in same grid as first two */}
          {[
            { label: 'Eagle',  pts: '4', color: 'text-yellow-400' },
            { label: 'Birdie', pts: '3', color: 'text-green-400'  },
          ].map(({ label, pts, color }) => (
            <div key={`m-${label}`} className="bg-gray-800 rounded-lg p-2 sm:hidden">
              <p className={`text-base font-bold ${color}`}>{pts}</p>
              <p className="text-gray-500 text-[10px]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Rolling 5 rule explainer ─────────────────────────────────────── */}
      <div className="bg-blue-950 border border-blue-900 rounded-2xl p-4 md:p-5">
        <h2 className="text-xs md:text-sm font-semibold text-blue-300 flex items-center gap-2 mb-2">
          <span aria-hidden="true">🔄</span> Rolling 5-score rule
        </h2>
        <p className="text-xs md:text-sm text-blue-200/70 leading-relaxed">
          GolfGives keeps your most recent{' '}
          <strong className="text-blue-200">5 scores</strong> on record. When
          you submit a 6th score your oldest round is automatically removed.
          This keeps your performance stats fresh and relevant to your current
          form. Your 5 scores are used to calculate your entries into the
          monthly prize draw.
        </p>
      </div>

      {/* ── Score management (subscription-gated) ────────────────────────── */}
      <SubscriptionGuard>
        <ScoreManager initialScores={initialScores ?? []} />
      </SubscriptionGuard>

    </div>
  )
}
