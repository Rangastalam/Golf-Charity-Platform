/**
 * @fileoverview Single winner endpoints.
 *
 * GET /api/winners/[id]
 *   — Authenticated: user can view their own record.
 *   — Admin: can view any record.
 *
 * PUT /api/winners/[id]  (admin only)
 *   Body: { action: 'verify' | 'reject' | 'mark_paid', reason?: string }
 *
 *   verify    — requires proof_url present; sets verified_at = now()
 *   reject    — deletes the winner record (no payment issued)
 *               accepts optional { reason } for logging
 *   mark_paid — requires verified_at present; sets payment_status = 'paid',
 *               paid_at = now()
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { USER_ROLES } from '@/constants'
import { onProofVerified, onPaymentSent } from '@/lib/notificationTriggers'

// ─── GET ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/winners/[id]
 *
 * @param {import('next/server').NextRequest} _request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<NextResponse>}
 */
export async function GET(_request, { params }) {
  try {
    const { id } = await params

    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const isAdmin = user.user_metadata?.role === USER_ROLES.ADMIN

    const { data: winner, error } = await supabaseAdmin
      .from('winners')
      .select(
        `id, user_id, match_type, prize_amount, payment_status, proof_url,
         verified_at, paid_at, created_at,
         draws ( id, month, mode, status, drawn_numbers ),
         profiles ( id, full_name, email )`
      )
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('GET /api/winners/[id] DB error:', error)
      return NextResponse.json({ error: 'Failed to fetch winner' }, { status: 500 })
    }

    if (!winner) {
      return NextResponse.json({ error: 'Winner record not found' }, { status: 404 })
    }

    // Non-admins can only see their own records
    if (!isAdmin && winner.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ winner })
  } catch (err) {
    console.error('GET /api/winners/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────

/**
 * PUT /api/winners/[id]
 * Admin only.
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
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { action, reason } = body

    if (!['verify', 'reject', 'mark_paid'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "verify", "reject", or "mark_paid"' },
        { status: 400 }
      )
    }

    // ── Fetch winner ──────────────────────────────────────────────────────────
    const { data: winner, error: fetchError } = await supabaseAdmin
      .from('winners')
      .select('id, user_id, payment_status, proof_url, verified_at, paid_at, match_type, prize_amount')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('PUT /api/winners/[id] fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch winner' }, { status: 500 })
    }

    if (!winner) {
      return NextResponse.json({ error: 'Winner record not found' }, { status: 404 })
    }

    // ── Dispatch action ───────────────────────────────────────────────────────
    if (action === 'verify')    return handleVerify(winner)
    if (action === 'reject')    return handleReject(winner, reason)
    if (action === 'mark_paid') return handleMarkPaid(winner)
  } catch (err) {
    console.error('PUT /api/winners/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Action: verify ───────────────────────────────────────────────────────────

/**
 * Sets verified_at to now().
 * Requires proof_url to already be present on the record.
 *
 * @param {{ id: string, proof_url?: string|null, verified_at?: string|null }} winner
 * @returns {Promise<NextResponse>}
 */
async function handleVerify(winner) {
  if (!winner.proof_url) {
    return NextResponse.json(
      { error: 'Cannot verify: winner has not uploaded proof yet.' },
      { status: 422 }
    )
  }

  if (winner.verified_at) {
    return NextResponse.json(
      { error: 'Winner has already been verified.' },
      { status: 409 }
    )
  }

  const { data: updated, error } = await supabaseAdmin
    .from('winners')
    .update({ verified_at: new Date().toISOString() })
    .eq('id', winner.id)
    .select()
    .single()

  if (error) {
    console.error('verify action DB error:', error)
    return NextResponse.json({ error: 'Failed to verify winner' }, { status: 500 })
  }

  // Trigger proof verified email (non-blocking)
  onProofVerified({ ...winner, ...updated }).catch(() => null)

  return NextResponse.json({ winner: updated })
}

// ─── Action: reject ───────────────────────────────────────────────────────────

/**
 * Deletes the winner record. The prize is effectively cancelled.
 * Logs the reason to the console for audit purposes.
 *
 * @param {{ id: string, match_type: string, prize_amount: number }} winner
 * @param {string|undefined} reason
 * @returns {Promise<NextResponse>}
 */
async function handleReject(winner, reason) {
  // Log rejection for audit trail before deleting
  console.info(
    `[winners] Rejecting winner ${winner.id} | match: ${winner.match_type} | ` +
    `prize: ${winner.prize_amount} | reason: ${reason ?? '(none provided)'}`
  )

  const { error } = await supabaseAdmin
    .from('winners')
    .delete()
    .eq('id', winner.id)

  if (error) {
    console.error('reject action DB error:', error)
    return NextResponse.json({ error: 'Failed to reject winner' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Winner record deleted. Prize has been cancelled.',
  })
}

// ─── Action: mark_paid ────────────────────────────────────────────────────────

/**
 * Sets payment_status = 'paid' and paid_at = now().
 * Requires verified_at to be set first (must be verified before paying).
 *
 * @param {{ id: string, verified_at?: string|null, payment_status: string }} winner
 * @returns {Promise<NextResponse>}
 */
async function handleMarkPaid(winner) {
  if (!winner.verified_at) {
    return NextResponse.json(
      { error: 'Cannot mark as paid: winner must be verified first.' },
      { status: 422 }
    )
  }

  if (winner.payment_status === 'paid') {
    return NextResponse.json(
      { error: 'Winner has already been marked as paid.' },
      { status: 409 }
    )
  }

  const { data: updated, error } = await supabaseAdmin
    .from('winners')
    .update({
      payment_status: 'paid',
      paid_at:        new Date().toISOString(),
    })
    .eq('id', winner.id)
    .select()
    .single()

  if (error) {
    console.error('mark_paid action DB error:', error)
    return NextResponse.json({ error: 'Failed to mark winner as paid' }, { status: 500 })
  }

  // Trigger payment sent email (non-blocking)
  onPaymentSent({ ...winner, ...updated }).catch(() => null)

  return NextResponse.json({ winner: updated })
}
