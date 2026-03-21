/**
 * @fileoverview Single-score endpoint.
 *
 * PUT /api/scores/[id]  — update a score's value and/or played_at date
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { validateScore, validateScoreDate } from '@/lib/scoreHelpers'

/**
 * PUT /api/scores/[id]
 * Body: { score?: number, played_at?: string }
 *
 * Only the score's owner may update it.
 * Returns the updated score object.
 *
 * @param {import('next/server').NextRequest} request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<NextResponse>}
 */
export async function PUT(request, { params }) {
  try {
    // params is a Promise in Next.js 15 App Router
    const { id } = await params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Score ID is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { score, played_at } = body

    if (score === undefined && played_at === undefined) {
      return NextResponse.json(
        { error: 'Provide at least one field to update: score or played_at' },
        { status: 400 }
      )
    }

    // ── Validate provided fields ───────────────────────────────────────────────
    if (score !== undefined) {
      const sv = validateScore(score)
      if (!sv.valid) {
        return NextResponse.json({ error: sv.error }, { status: 400 })
      }
    }

    if (played_at !== undefined) {
      const dv = validateScoreDate(played_at)
      if (!dv.valid) {
        return NextResponse.json({ error: dv.error }, { status: 400 })
      }
    }

    // ── Verify ownership ──────────────────────────────────────────────────────
    const { data: existing, error: fetchError } = await supabase
      .from('scores')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('PUT /api/scores/[id] fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch score' }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: 'Score not found' }, { status: 404 })
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Build update payload ──────────────────────────────────────────────────
    /** @type {Record<string, unknown>} */
    const updates = {}
    if (score !== undefined) updates.score = Number(score)
    if (played_at !== undefined) updates.played_at = String(played_at).slice(0, 10)

    // ── Update ────────────────────────────────────────────────────────────────
    const { data: updatedScore, error: updateError } = await supabase
      .from('scores')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, score, played_at, created_at')
      .single()

    if (updateError) {
      console.error('PUT /api/scores/[id] update error:', updateError)
      return NextResponse.json({ error: 'Failed to update score' }, { status: 500 })
    }

    return NextResponse.json({ score: updatedScore })
  } catch (err) {
    console.error('PUT /api/scores/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
