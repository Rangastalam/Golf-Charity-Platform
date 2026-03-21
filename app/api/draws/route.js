/**
 * @fileoverview Draw endpoints.
 *
 * GET  /api/draws           — lists published draws, newest first (public)
 *                             Optional ?month=YYYY-MM to filter to one month
 * POST /api/draws           — admin: creates/initialises a draw for a month
 *                             Body: { month: 'YYYY-MM', mode: 'random'|'algorithmic' }
 *
 * The lifecycle of a draw:
 *   configured → (admin runs simulate) → simulated → (admin publishes) → published
 *
 * POST only creates the draw record + prize_pool record in 'configured' status.
 * Actual number generation and winner resolution happen via PUT /api/draws/[id].
 */

import { NextResponse }               from 'next/server'
import { cookies }                    from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { supabaseAdmin }              from '@/lib/supabase-admin'
import { calculatePrizePool, splitPrizePool, calculateRevenueBreakdown } from '@/lib/prizePool'
import { validateDrawMode, getCurrentMonth, formatDrawMonth } from '@/lib/drawHelpers'
import { validateMonth }              from '@/lib/validation'
import { USER_ROLES }                 from '@/constants'

// ─── GET ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/draws
 * Returns published draw results, newest first (up to 12).
 * Optional ?month=YYYY-MM to retrieve a single month.
 *
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<NextResponse>}
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const supabase    = createServerSupabaseClient(cookieStore)

    const { searchParams } = new URL(request.url)
    const monthParam       = searchParams.get('month')

    // ── Optional month filter — validate format early ─────────────────────────
    if (monthParam) {
      const monthVal = validateMonth(monthParam)
      if (!monthVal.valid) {
        return NextResponse.json({ error: monthVal.error }, { status: 400 })
      }
    }

    // ── Check if requester is admin (admins may see non-published draws) ──────
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const isAdmin = user?.user_metadata?.role === USER_ROLES.ADMIN

    // ── Build query ───────────────────────────────────────────────────────────
    let query = supabaseAdmin
      .from('draws')
      .select(
        `id, month, mode, status, drawn_numbers, simulated_at, published_at, created_at,
         prize_pools ( total_pool, five_match_pool, four_match_pool, three_match_pool, jackpot_carryover, active_subscriber_count ),
         winners (
           id, match_type, prize_amount, payment_status,
           profiles ( full_name )
         )`
      )
      .order('month', { ascending: false })
      .limit(12)

    if (!isAdmin) {
      query = query.eq('status', 'published')
    }

    if (monthParam) {
      query = query.eq('month', monthParam)
    }

    const { data: draws, error } = await query

    if (error) {
      console.error('GET /api/draws DB error:', error)
      return NextResponse.json({ error: 'Failed to fetch draws' }, { status: 500 })
    }

    return NextResponse.json({ draws: draws ?? [] })
  } catch (err) {
    console.error('GET /api/draws error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/draws
 * Admin only. Creates a new draw record in 'configured' status.
 *
 * Body: { month?: 'YYYY-MM', mode?: 'random'|'algorithmic' }
 * Defaults: month = current month, mode = 'random'
 *
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase    = createServerSupabaseClient(cookieStore)

    // ── Auth + admin check ────────────────────────────────────────────────────
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    if (user.user_metadata?.role !== USER_ROLES.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body = {}
    try {
      body = await request.json()
    } catch {
      // No body is fine — defaults apply
    }

    const month = body.month ?? getCurrentMonth()
    const mode  = body.mode  ?? 'random'

    // ── Validate month (YYYY-MM format) ───────────────────────────────────────
    const monthValidation = validateMonth(month)
    if (!monthValidation.valid) {
      return NextResponse.json({ error: monthValidation.error }, { status: 400 })
    }

    // ── Validate mode ─────────────────────────────────────────────────────────
    const modeValidation = validateDrawMode(mode)
    if (!modeValidation.valid) {
      return NextResponse.json({ error: modeValidation.error }, { status: 400 })
    }

    // ── Reject unexpected body fields ─────────────────────────────────────────
    const allowed = new Set(['month', 'mode'])
    const extra   = Object.keys(body).filter((k) => !allowed.has(k))
    if (extra.length > 0) {
      return NextResponse.json(
        { error: `Unexpected fields: ${extra.join(', ')}` },
        { status: 400 }
      )
    }

    // ── Check draw doesn't already exist for this month ───────────────────────
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('draws')
      .select('id, status')
      .eq('month', month)
      .maybeSingle()

    if (existingError) {
      console.error('POST /api/draws: draw lookup error', existingError)
      return NextResponse.json({ error: 'Failed to check existing draw' }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json(
        { error: `A draw already exists for ${formatDrawMonth(month)} (status: ${existing.status})` },
        { status: 409 }
      )
    }

    // ── Fetch active subscriptions to compute prize pool ──────────────────────
    const { data: activeSubs, error: subsError } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, plan')
      .eq('status', 'active')

    if (subsError) {
      console.error('POST /api/draws: subscriptions fetch error', subsError)
      return NextResponse.json({ error: 'Failed to fetch subscriber data' }, { status: 500 })
    }

    const subInput = (activeSubs ?? []).map((s) => ({
      userId: s.user_id,
      tierId: s.plan ?? 'monthly',
    }))

    const revenue = calculateRevenueBreakdown(subInput)

    // Fetch previous month's jackpot carryover
    const prevMonth = getPrevMonth(month)
    const { data: prevPool } = await supabaseAdmin
      .from('prize_pools')
      .select('jackpot_carryover, five_match_pool')
      .eq('month', prevMonth)
      .maybeSingle()

    const { data: prevDraw } = await supabaseAdmin
      .from('draws')
      .select('id, status')
      .eq('month', prevMonth)
      .maybeSingle()

    let jackpotCarryover = 0
    if (prevDraw && prevPool) {
      const { count: prevFiveMatchCount } = await supabaseAdmin
        .from('winners')
        .select('id', { count: 'exact', head: true })
        .eq('draw_id', prevDraw.id)
        .eq('match_type', 'five_match')

      if ((prevFiveMatchCount ?? 0) === 0) {
        jackpotCarryover = prevPool.five_match_pool ?? 0
      }
    }

    const { fiveMatchPool, fourMatchPool, threeMatchPool } = splitPrizePool(
      revenue.prizePool,
      jackpotCarryover
    )

    // ── Insert prize_pool record ───────────────────────────────────────────────
    const { data: prizePoolRecord, error: ppError } = await supabaseAdmin
      .from('prize_pools')
      .insert({
        month,
        total_pool:              revenue.prizePool,
        five_match_pool:         fiveMatchPool,
        four_match_pool:         fourMatchPool,
        three_match_pool:        threeMatchPool,
        jackpot_carryover:       jackpotCarryover,
        active_subscriber_count: subInput.length,
      })
      .select()
      .single()

    if (ppError) {
      console.error('POST /api/draws: prize_pool insert error', ppError)
      return NextResponse.json({ error: 'Failed to create prize pool' }, { status: 500 })
    }

    // ── Insert draw record ────────────────────────────────────────────────────
    const { data: draw, error: drawError } = await supabaseAdmin
      .from('draws')
      .insert({
        month,
        mode,
        status:        'configured',
        drawn_numbers: null,
        prize_pool_id: prizePoolRecord.id,
      })
      .select()
      .single()

    if (drawError) {
      console.error('POST /api/draws: draw insert error', drawError)
      await supabaseAdmin.from('prize_pools').delete().eq('id', prizePoolRecord.id)
      return NextResponse.json({ error: 'Failed to create draw' }, { status: 500 })
    }

    return NextResponse.json(
      {
        draw: {
          id:     draw.id,
          month,
          mode,
          status: draw.status,
          prizePool: {
            total:      revenue.prizePool,
            fiveMatch:  fiveMatchPool,
            fourMatch:  fourMatchPool,
            threeMatch: threeMatchPool,
            carryover:  jackpotCarryover,
          },
          subscriberCount: subInput.length,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('POST /api/draws error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Returns the 'YYYY-MM' string for the month before the given one.
 *
 * @param {string} month - 'YYYY-MM'
 * @returns {string}
 */
function getPrevMonth(month) {
  const [year, mon] = month.split('-').map(Number)
  const d = new Date(year, mon - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
