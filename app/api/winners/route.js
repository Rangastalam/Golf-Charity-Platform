/**
 * @fileoverview Winners collection endpoint.
 *
 * GET /api/winners
 *   — Authenticated user: returns their own winning records with draw details.
 *
 * GET /api/winners?all=true   (admin only)
 *   — Returns all winners across all draws.
 *   — Supports filters: ?status=pending|paid  ?drawId=<uuid>
 *   — Includes user profile and draw details.
 *
 * All results ordered by created_at DESC.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { USER_ROLES } from '@/constants'

/**
 * GET /api/winners
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
    const allParam  = searchParams.get('all') === 'true'
    const status    = searchParams.get('status')   // 'pending' | 'paid'
    const drawId    = searchParams.get('drawId')

    const isAdmin = user.user_metadata?.role === USER_ROLES.ADMIN

    // ── Admin — all winners ────────────────────────────────────────────────────
    if (allParam) {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      let query = supabaseAdmin
        .from('winners')
        .select(
          `id, match_type, prize_amount, payment_status, proof_url,
           verified_at, paid_at, created_at,
           profiles ( id, full_name, email ),
           draws ( id, month, mode, status )`
        )
        .order('created_at', { ascending: false })

      if (status === 'pending' || status === 'paid') {
        query = query.eq('payment_status', status)
      }

      if (drawId) {
        query = query.eq('draw_id', drawId)
      }

      const { data: winners, error } = await query

      if (error) {
        console.error('GET /api/winners (admin) DB error:', error)
        return NextResponse.json({ error: 'Failed to fetch winners' }, { status: 500 })
      }

      return NextResponse.json({ winners: winners ?? [] })
    }

    // ── Authenticated user — own winners only ──────────────────────────────────
    let query = supabaseAdmin
      .from('winners')
      .select(
        `id, match_type, prize_amount, payment_status, proof_url,
         verified_at, paid_at, created_at,
         draws ( id, month, mode, status, drawn_numbers )`
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status === 'pending' || status === 'paid') {
      query = query.eq('payment_status', status)
    }

    const { data: winners, error } = await query

    if (error) {
      console.error('GET /api/winners DB error:', error)
      return NextResponse.json({ error: 'Failed to fetch winners' }, { status: 500 })
    }

    return NextResponse.json({ winners: winners ?? [] })
  } catch (err) {
    console.error('GET /api/winners error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
