/**
 * @fileoverview Admin winners list API.
 *
 * GET /api/admin/winners?filter=pending|verified|paid|all
 */

import { cookies }       from 'next/headers'
import { NextResponse }  from 'next/server'
import { requireAdmin }  from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req) {
  try {
    const cookieStore = await cookies()
    await requireAdmin(cookieStore)

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') ?? 'pending'

    let query = supabaseAdmin
      .from('winners')
      .select(`
        id, draw_id, user_id, match_type, prize_amount, payment_status,
        proof_url, verified_at, paid_at, created_at,
        profiles(full_name, email),
        draws(month)
      `)
      .order('created_at', { ascending: false })

    if (filter === 'pending') {
      query = query.is('verified_at', null).eq('payment_status', 'pending')
    } else if (filter === 'verified') {
      query = query.not('verified_at', 'is', null).neq('payment_status', 'paid')
    } else if (filter === 'paid') {
      query = query.eq('payment_status', 'paid')
    }
    // 'all' — no additional filter

    const { data, error } = await query

    if (error) throw error

    // Map draw relation alias
    const winners = (data ?? []).map((w) => ({
      ...w,
      draw: w.draws ?? null,
    }))

    return NextResponse.json({ winners })
  } catch (err) {
    const status = err?.status === 401 ? 401 : err?.status === 403 ? 403 : 500
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status })
  }
}
