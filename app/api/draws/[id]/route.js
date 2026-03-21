/**
 * @fileoverview Draw detail and action endpoints.
 *
 * GET /api/draws/[id]                     — retrieve draw + winners (admin sees all statuses)
 * PUT /api/draws/[id]  { action }         — admin: progress the draw through its lifecycle
 *
 * Supported actions:
 *   simulate  — generate drawn_numbers and resolve winners; status: configured → simulated
 *   publish   — lock and expose results publicly;            status: simulated  → published
 *   reset     — clear numbers and winners;                   status: simulated  → configured
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  generateRandomDraw,
  generateAlgorithmicDraw,
  findAllWinners,
} from '@/lib/drawEngine'
import { calculateWinnerPrize, calculateJackpotRollover } from '@/lib/prizePool'
import { USER_ROLES } from '@/constants'
import { onDrawPublished } from '@/lib/notificationTriggers'

// ─── GET ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/draws/[id]
 * Admins see draws at any status. Non-admins may only see published draws.
 *
 * @param {import('next/server').NextRequest} request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<NextResponse>}
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params

    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const isAdmin = user?.user_metadata?.role === USER_ROLES.ADMIN

    const { data: draw, error } = await supabaseAdmin
      .from('draws')
      .select(
        `id, month, mode, status, drawn_numbers, simulated_at, published_at, created_at,
         prize_pools ( total_pool, five_match_pool, four_match_pool, three_match_pool, jackpot_carryover, active_subscriber_count ),
         winners (
           id, match_type, prize_amount, payment_status, verified_at, paid_at,
           profiles ( full_name )
         ),
         draw_entries ( count )`
      )
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('GET /api/draws/[id] DB error:', error)
      return NextResponse.json({ error: 'Failed to fetch draw' }, { status: 500 })
    }

    if (!draw) {
      return NextResponse.json({ error: 'Draw not found' }, { status: 404 })
    }

    if (!isAdmin && draw.status !== 'published') {
      return NextResponse.json({ error: 'Draw not found' }, { status: 404 })
    }

    return NextResponse.json({ draw })
  } catch (err) {
    console.error('GET /api/draws/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────

/**
 * PUT /api/draws/[id]
 * Admin only. Advances or resets the draw lifecycle.
 * Body: { action: 'simulate' | 'publish' | 'reset' }
 *
 * @param {import('next/server').NextRequest} request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<NextResponse>}
 */
export async function PUT(request, { params }) {
  try {
    const { id } = await params

    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)

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
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { action } = body
    if (!['simulate', 'publish', 'reset'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "simulate", "publish", or "reset"' },
        { status: 400 }
      )
    }

    // ── Fetch the draw ────────────────────────────────────────────────────────
    const { data: draw, error: drawError } = await supabaseAdmin
      .from('draws')
      .select('id, month, mode, status, drawn_numbers, prize_pool_id')
      .eq('id', id)
      .maybeSingle()

    if (drawError) {
      console.error('PUT /api/draws/[id] draw fetch error:', drawError)
      return NextResponse.json({ error: 'Failed to fetch draw' }, { status: 500 })
    }

    if (!draw) {
      return NextResponse.json({ error: 'Draw not found' }, { status: 404 })
    }

    // ── Dispatch action ───────────────────────────────────────────────────────
    if (action === 'simulate') return handleSimulate(draw)
    if (action === 'publish')  return handlePublish(draw)
    if (action === 'reset')    return handleReset(draw)
  } catch (err) {
    console.error('PUT /api/draws/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Action: simulate ─────────────────────────────────────────────────────────

/**
 * Generates drawn_numbers, resolves all winners, and writes everything to the DB.
 * Idempotent: re-running simulate on a 'simulated' draw resets and re-runs.
 *
 * @param {{ id: string, month: string, mode: string, status: string, prize_pool_id: string }} draw
 * @returns {Promise<NextResponse>}
 */
async function handleSimulate(draw) {
  if (!['configured', 'simulated'].includes(draw.status)) {
    return NextResponse.json(
      { error: `Cannot simulate a draw with status "${draw.status}"` },
      { status: 409 }
    )
  }

  // ── Fetch all draw entries for this draw ──────────────────────────────────
  const { data: entries, error: entriesError } = await supabaseAdmin
    .from('draw_entries')
    .select('id, user_id, scores_snapshot')
    .eq('draw_id', draw.id)

  if (entriesError) {
    console.error('simulate: entries fetch error', entriesError)
    return NextResponse.json({ error: 'Failed to fetch draw entries' }, { status: 500 })
  }

  const drawEntries = (entries ?? []).map((e) => ({
    userId: e.user_id,
    scoresSnapshot: e.scores_snapshot ?? [],
  }))

  const hasNoEntrants = drawEntries.length === 0

  // ── Generate drawn numbers ────────────────────────────────────────────────
  let drawnNumbers
  if (draw.mode === 'algorithmic') {
    drawnNumbers = generateAlgorithmicDraw(drawEntries, draw.month)
  } else {
    drawnNumbers = generateRandomDraw(draw.month)
  }

  // ── Resolve winners ───────────────────────────────────────────────────────
  const { fiveMatch, fourMatch, threeMatch } = findAllWinners(drawEntries, drawnNumbers)

  // ── Fetch prize pool amounts ──────────────────────────────────────────────
  const { data: prizePool, error: ppError } = await supabaseAdmin
    .from('prize_pools')
    .select('five_match_pool, four_match_pool, three_match_pool')
    .eq('id', draw.prize_pool_id)
    .single()

  if (ppError || !prizePool) {
    console.error('simulate: prize_pool fetch error', ppError)
    return NextResponse.json({ error: 'Failed to fetch prize pool' }, { status: 500 })
  }

  // Per-winner amounts (pool split equally among tier winners)
  const fiveMatchPrize  = fiveMatch.length  > 0 ? calculateWinnerPrize(prizePool.five_match_pool,  fiveMatch.length)  : 0
  const fourMatchPrize  = fourMatch.length  > 0 ? calculateWinnerPrize(prizePool.four_match_pool,  fourMatch.length)  : 0
  const threeMatchPrize = threeMatch.length > 0 ? calculateWinnerPrize(prizePool.three_match_pool, threeMatch.length) : 0

  // ── Clear any previous simulation winners ─────────────────────────────────
  const { error: deleteError } = await supabaseAdmin
    .from('winners')
    .delete()
    .eq('draw_id', draw.id)

  if (deleteError) {
    console.error('simulate: winners delete error', deleteError)
    return NextResponse.json({ error: 'Failed to reset previous winners' }, { status: 500 })
  }

  // ── Insert new winners ────────────────────────────────────────────────────
  const winnerRows = [
    ...fiveMatch.map((w)  => ({ draw_id: draw.id, user_id: w.userId, match_type: 'five_match',  prize_amount: fiveMatchPrize,  payment_status: 'pending' })),
    ...fourMatch.map((w)  => ({ draw_id: draw.id, user_id: w.userId, match_type: 'four_match',  prize_amount: fourMatchPrize,  payment_status: 'pending' })),
    ...threeMatch.map((w) => ({ draw_id: draw.id, user_id: w.userId, match_type: 'three_match', prize_amount: threeMatchPrize, payment_status: 'pending' })),
  ]

  if (winnerRows.length > 0) {
    const { error: winnersError } = await supabaseAdmin
      .from('winners')
      .insert(winnerRows)

    if (winnersError) {
      console.error('simulate: winners insert error', winnersError)
      return NextResponse.json({ error: 'Failed to save winners' }, { status: 500 })
    }
  }

  // ── Update draw record ────────────────────────────────────────────────────
  const { data: updatedDraw, error: updateError } = await supabaseAdmin
    .from('draws')
    .update({
      drawn_numbers: drawnNumbers,
      status:        'simulated',
      simulated_at:  new Date().toISOString(),
    })
    .eq('id', draw.id)
    .select()
    .single()

  if (updateError) {
    console.error('simulate: draw update error', updateError)
    return NextResponse.json({ error: 'Failed to update draw status' }, { status: 500 })
  }

  // ── Update prize_pool jackpot_carryover ────────────────────────────────────
  const rollover = calculateJackpotRollover(prizePool.five_match_pool, fiveMatch.length)
  await supabaseAdmin
    .from('prize_pools')
    .update({ jackpot_carryover: rollover })
    .eq('id', draw.prize_pool_id)

  return NextResponse.json({
    draw: updatedDraw,
    drawnNumbers,
    winners: {
      fiveMatch:  fiveMatch.length,
      fourMatch:  fourMatch.length,
      threeMatch: threeMatch.length,
    },
    prizes: {
      fiveMatch:  fiveMatchPrize,
      fourMatch:  fourMatchPrize,
      threeMatch: threeMatchPrize,
    },
    jackpotRollover: rollover,
    ...(hasNoEntrants
      ? { warning: 'No draw entries found. The simulation ran with zero entrants — no winners were selected. Ensure subscribers have submitted scores before publishing.' }
      : {}),
  })
}

// ─── Action: publish ──────────────────────────────────────────────────────────

/**
 * Locks a simulated draw as published. Results become publicly visible.
 * No further changes to drawn_numbers or winners are permitted after this point.
 *
 * @param {{ id: string, status: string }} draw
 * @returns {Promise<NextResponse>}
 */
async function handlePublish(draw) {
  if (draw.status !== 'simulated') {
    return NextResponse.json(
      { error: `Cannot publish a draw with status "${draw.status}". Run simulate first.` },
      { status: 409 }
    )
  }

  const { data: updatedDraw, error } = await supabaseAdmin
    .from('draws')
    .update({
      status:       'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', draw.id)
    .select()
    .single()

  if (error) {
    console.error('publish: draw update error', error)
    return NextResponse.json({ error: 'Failed to publish draw' }, { status: 500 })
  }

  // Trigger draw result emails to all entrants (non-blocking)
  onDrawPublished({
    id:           draw.id,
    month:        draw.month,
    drawn_numbers: updatedDraw.drawn_numbers ?? draw.drawn_numbers,
  }).catch(() => null)

  return NextResponse.json({ draw: updatedDraw })
}

// ─── Action: reset ────────────────────────────────────────────────────────────

/**
 * Resets a simulated draw back to 'configured'.
 * Clears drawn_numbers and deletes all winner records so simulate can be re-run.
 * A published draw cannot be reset.
 *
 * @param {{ id: string, status: string }} draw
 * @returns {Promise<NextResponse>}
 */
async function handleReset(draw) {
  if (draw.status === 'published') {
    return NextResponse.json(
      { error: 'A published draw cannot be reset. Results have already been made public.' },
      { status: 409 }
    )
  }

  if (draw.status !== 'simulated') {
    return NextResponse.json(
      { error: `Only simulated draws can be reset (current status: "${draw.status}")` },
      { status: 409 }
    )
  }

  // Delete winners first
  const { error: deleteError } = await supabaseAdmin
    .from('winners')
    .delete()
    .eq('draw_id', draw.id)

  if (deleteError) {
    console.error('reset: winners delete error', deleteError)
    return NextResponse.json({ error: 'Failed to remove winners' }, { status: 500 })
  }

  const { data: updatedDraw, error: updateError } = await supabaseAdmin
    .from('draws')
    .update({
      drawn_numbers: null,
      status:        'configured',
      simulated_at:  null,
    })
    .eq('id', draw.id)
    .select()
    .single()

  if (updateError) {
    console.error('reset: draw update error', updateError)
    return NextResponse.json({ error: 'Failed to reset draw' }, { status: 500 })
  }

  return NextResponse.json({ draw: updatedDraw })
}
