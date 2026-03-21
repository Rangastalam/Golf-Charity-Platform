/**
 * @fileoverview Score endpoints.
 *
 * GET    /api/scores  — authenticated user's scores, ordered most-recent first (max 5)
 * POST   /api/scores  — submit a new Stableford score (requires active subscription)
 * DELETE /api/scores  — delete a score by id (body: { id })
 *
 * Edge cases handled:
 *  - Future dates are rejected with a clear error.
 *  - Lapsed subscribers get a specific "please update payment" message.
 *  - Duplicate score on the same date is allowed but the response includes
 *    a `warning` field that the client can surface to the user.
 */

import { NextResponse }               from 'next/server'
import { cookies }                    from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { validateScore }              from '@/lib/validation'
import { validateUUID }               from '@/lib/validation'
import { validateScoreDate }          from '@/lib/scoreHelpers'

// ─── Shared helpers ────────────────────────────────────────────────────────────

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 */
async function fetchUserScores(supabase, userId) {
  const { data, error } = await supabase
    .from('scores')
    .select('id, score, played_at, created_at')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(5)

  if (error) throw error
  return data ?? []
}

/**
 * Returns the subscription status string (or null) for a user.
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
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.status ?? null
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase    = createServerSupabaseClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const scores = await fetchUserScores(supabase, user.id)
    return NextResponse.json({ scores })
  } catch (err) {
    console.error('GET /api/scores error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/scores
 * Body: { score: number, played_at: string (yyyy-MM-dd) }
 *
 * @param {import('next/server').NextRequest} request
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase    = createServerSupabaseClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // ── Subscription gate — distinguish lapsed from never-subscribed ─────────
    const subStatus = await getSubscriptionStatus(supabase, user.id)

    if (subStatus !== 'active') {
      const message = subStatus === 'lapsed'
        ? 'Your subscription has lapsed. Please update your payment method to continue submitting scores.'
        : subStatus === 'cancelled'
          ? 'Your subscription is cancelled. Please resubscribe to submit scores.'
          : 'An active subscription is required to submit scores.'

      return NextResponse.json({ error: message }, { status: 403 })
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { score, played_at } = body

    // ── Reject unknown fields ─────────────────────────────────────────────────
    if (Object.keys(body).some((k) => !['score', 'played_at'].includes(k))) {
      return NextResponse.json({ error: 'Unexpected fields in request body' }, { status: 400 })
    }

    // ── Validate score (integer 1–45) ─────────────────────────────────────────
    const scoreValidation = validateScore(score)
    if (!scoreValidation.valid) {
      return NextResponse.json({ error: scoreValidation.error }, { status: 400 })
    }

    // ── Validate date format ──────────────────────────────────────────────────
    const dateValidation = validateScoreDate(played_at)
    if (!dateValidation.valid) {
      return NextResponse.json({ error: dateValidation.error }, { status: 400 })
    }

    // ── Reject future dates ───────────────────────────────────────────────────
    const today      = new Date().toISOString().slice(0, 10)
    const dateString = String(played_at).slice(0, 10)
    if (dateString > today) {
      return NextResponse.json(
        { error: 'Score date cannot be in the future.' },
        { status: 400 }
      )
    }

    // ── Check for existing score on same date (allow, but warn) ──────────────
    const { data: existingOnDate } = await supabase
      .from('scores')
      .select('id')
      .eq('user_id', user.id)
      .eq('played_at', dateString)
      .limit(1)

    const hasDuplicateDate = Array.isArray(existingOnDate) && existingOnDate.length > 0

    // ── Insert ────────────────────────────────────────────────────────────────
    const { error: insertError } = await supabase
      .from('scores')
      .insert({
        user_id:   user.id,
        score:     Number(score),
        played_at: dateString,
      })

    if (insertError) {
      console.error('POST /api/scores insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save score' }, { status: 500 })
    }

    const scores = await fetchUserScores(supabase, user.id)

    return NextResponse.json(
      {
        scores,
        ...(hasDuplicateDate
          ? { warning: 'You already have a score recorded for this date. Both have been saved.' }
          : {}),
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('POST /api/scores error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * DELETE /api/scores
 * Body: { id: string }
 *
 * @param {import('next/server').NextRequest} request
 */
export async function DELETE(request) {
  try {
    const cookieStore = await cookies()
    const supabase    = createServerSupabaseClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { id } = body

    if (!id || !validateUUID(id)) {
      return NextResponse.json({ error: 'id must be a valid UUID' }, { status: 400 })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('scores')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('DELETE /api/scores fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to verify score' }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: 'Score not found' }, { status: 404 })
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('scores')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('DELETE /api/scores delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete score' }, { status: 500 })
    }

    const scores = await fetchUserScores(supabase, user.id)
    return NextResponse.json({ scores })
  } catch (err) {
    console.error('DELETE /api/scores error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
