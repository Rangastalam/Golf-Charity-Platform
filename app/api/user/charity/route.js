/**
 * @fileoverview User charity selection endpoints.
 *
 * GET  /api/user/charity  — authenticated: returns user's current charity selection
 *                           with charity details and contribution percentage
 *
 * POST /api/user/charity  — authenticated: upsert user_charity_selections
 *                           Body: { charityId, contributionPercentage }
 *                           contributionPercentage must be 10–100
 */

import { NextResponse }               from 'next/server'
import { cookies }                    from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { validateUUID, validateContributionPercentage } from '@/lib/validation'

// ─── GET ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/user/charity
 *
 * @returns {Promise<NextResponse>}
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase    = createServerSupabaseClient(cookieStore)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { data: selection, error } = await supabase
      .from('user_charity_selections')
      .select(
        `id, contribution_percentage, updated_at,
         charities ( id, name, description, image_url, website_url, is_featured )`
      )
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('GET /api/user/charity DB error:', error)
      return NextResponse.json({ error: 'Failed to fetch charity selection' }, { status: 500 })
    }

    if (!selection) {
      return NextResponse.json({ selection: null })
    }

    return NextResponse.json({ selection })
  } catch (err) {
    console.error('GET /api/user/charity error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/user/charity
 * Upserts the user's charity selection.
 *
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase    = createServerSupabaseClient(cookieStore)

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

    const { charityId, contributionPercentage } = body

    // ── Validate charityId — must be a well-formed UUID ───────────────────────
    if (!charityId || !validateUUID(charityId)) {
      return NextResponse.json(
        { error: 'charityId must be a valid UUID' },
        { status: 400 }
      )
    }

    // ── Validate contributionPercentage — 10..100 ─────────────────────────────
    const pctResult = validateContributionPercentage(contributionPercentage)
    if (!pctResult.valid) {
      return NextResponse.json({ error: pctResult.error }, { status: 400 })
    }
    const pct = Number(contributionPercentage)

    // ── Verify the charity is active ──────────────────────────────────────────
    const { data: charity, error: charityError } = await supabase
      .from('charities')
      .select('id, name')
      .eq('id', charityId)
      .eq('is_active', true)
      .maybeSingle()

    if (charityError) {
      console.error('POST /api/user/charity charity check error:', charityError)
      return NextResponse.json({ error: 'Failed to verify charity' }, { status: 500 })
    }

    if (!charity) {
      return NextResponse.json({ error: 'Charity not found' }, { status: 404 })
    }

    // ── Upsert — user_id has a UNIQUE constraint ──────────────────────────────
    const { data: selection, error: upsertError } = await supabase
      .from('user_charity_selections')
      .upsert(
        {
          user_id:                 user.id,
          charity_id:              charityId,
          contribution_percentage: pct,
          updated_at:              new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select(
        `id, contribution_percentage, updated_at,
         charities ( id, name, description, image_url, website_url, is_featured )`
      )
      .single()

    if (upsertError) {
      console.error('POST /api/user/charity upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save charity selection' }, { status: 500 })
    }

    return NextResponse.json({ selection })
  } catch (err) {
    console.error('POST /api/user/charity error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
