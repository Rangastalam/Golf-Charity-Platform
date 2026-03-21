/**
 * @fileoverview Draw entries endpoints.
 *
 * POST /api/draws/entries  — member submits their entry for the current month's draw
 *                            Body: { month?: 'YYYY-MM' } (defaults to current month)
 * GET  /api/draws/entries  — returns the authenticated user's draw entries
 *                            Optional ?month=YYYY-MM to filter
 *
 * Entry rules:
 *  - Requires an active subscription.
 *  - Member must have at least MIN_SCORES_FOR_ENTRY (3) scores on record.
 *  - One entry per member per draw (enforced by UNIQUE(draw_id, user_id)).
 *  - The draw must be in 'configured' status (entries close once simulate runs).
 *  - The member's current scores are snapshotted at entry time.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { validateMonth, getCurrentMonth, MIN_SCORES_FOR_ENTRY } from '@/lib/drawHelpers'

// ─── POST ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/draws/entries
 * Submits an entry for the current (or specified) month's draw.
 * Snapshots the member's scores at entry time.
 *
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)

    // ── Auth ──────────────────────────────────────────────────────────────────
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body = {}
    try {
      body = await request.json()
    } catch {
      // No body — default to current month
    }

    const month = body.month ?? getCurrentMonth()

    const monthValidation = validateMonth(month)
    if (!monthValidation.valid) {
      return NextResponse.json({ error: monthValidation.error }, { status: 400 })
    }

    // ── Subscription gate ─────────────────────────────────────────────────────
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)

    if (!Array.isArray(subData) || subData.length === 0) {
      return NextResponse.json(
        { error: 'An active subscription is required to enter the draw' },
        { status: 403 }
      )
    }

    // ── Fetch member's scores ─────────────────────────────────────────────────
    const { data: scores, error: scoresError } = await supabase
      .from('scores')
      .select('score')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .limit(5)

    if (scoresError) {
      console.error('POST /api/draws/entries scores fetch error:', scoresError)
      return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
    }

    const scoreValues = (scores ?? []).map((s) => s.score)

    if (scoreValues.length < MIN_SCORES_FOR_ENTRY) {
      return NextResponse.json(
        {
          error: `You need at least ${MIN_SCORES_FOR_ENTRY} scores to enter the draw. You currently have ${scoreValues.length}.`,
        },
        { status: 422 }
      )
    }

    // ── Look up draw for this month ───────────────────────────────────────────
    const { data: draw, error: drawError } = await supabaseAdmin
      .from('draws')
      .select('id, status')
      .eq('month', month)
      .maybeSingle()

    if (drawError) {
      console.error('POST /api/draws/entries draw lookup error:', drawError)
      return NextResponse.json({ error: 'Failed to look up draw' }, { status: 500 })
    }

    if (!draw) {
      return NextResponse.json(
        { error: `No draw has been configured for ${month} yet` },
        { status: 404 }
      )
    }

    if (draw.status !== 'configured') {
      return NextResponse.json(
        { error: `Entries for the ${month} draw are closed (status: ${draw.status})` },
        { status: 409 }
      )
    }

    // ── Check for existing entry ──────────────────────────────────────────────
    const { data: existingEntry } = await supabaseAdmin
      .from('draw_entries')
      .select('id, scores_snapshot')
      .eq('draw_id', draw.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingEntry) {
      return NextResponse.json(
        {
          error: 'You have already entered this draw',
          entry: existingEntry,
        },
        { status: 409 }
      )
    }

    // ── Insert entry with score snapshot ──────────────────────────────────────
    const { data: entry, error: insertError } = await supabaseAdmin
      .from('draw_entries')
      .insert({
        draw_id:         draw.id,
        user_id:         user.id,
        scores_snapshot: scoreValues,
      })
      .select()
      .single()

    if (insertError) {
      console.error('POST /api/draws/entries insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create draw entry' }, { status: 500 })
    }

    return NextResponse.json({ entry }, { status: 201 })
  } catch (err) {
    console.error('POST /api/draws/entries error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/draws/entries
 * Returns the authenticated user's draw entries, newest first.
 * Optional ?month=YYYY-MM to filter to a single month.
 *
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<NextResponse>}
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')

    // ── Build query ───────────────────────────────────────────────────────────
    let query = supabaseAdmin
      .from('draw_entries')
      .select(
        `id, scores_snapshot, created_at,
         draws ( id, month, mode, status, drawn_numbers, published_at )`
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(24)

    if (monthParam) {
      const monthValidation = validateMonth(monthParam)
      if (!monthValidation.valid) {
        return NextResponse.json({ error: monthValidation.error }, { status: 400 })
      }
      // Filter via the related draws table (nested filter)
      query = query.eq('draws.month', monthParam)
    }

    const { data: entries, error } = await query

    if (error) {
      console.error('GET /api/draws/entries DB error:', error)
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
    }

    // Also fetch the user's winner records for context
    const entryDrawIds = (entries ?? [])
      .map((e) => e.draws?.id)
      .filter(Boolean)

    let winners = []
    if (entryDrawIds.length > 0) {
      const { data: winnerData } = await supabaseAdmin
        .from('winners')
        .select('draw_id, match_type, prize_amount, payment_status')
        .eq('user_id', user.id)
        .in('draw_id', entryDrawIds)

      winners = winnerData ?? []
    }

    // Attach winner info to each entry
    const enrichedEntries = (entries ?? []).map((entry) => {
      const drawId = entry.draws?.id
      const win = winners.find((w) => w.draw_id === drawId) ?? null
      return { ...entry, win }
    })

    return NextResponse.json({ entries: enrichedEntries })
  } catch (err) {
    console.error('GET /api/draws/entries error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
