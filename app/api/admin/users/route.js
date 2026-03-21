/**
 * @fileoverview GET /api/admin/users
 *
 * Returns a paginated, searchable, filterable list of all users.
 * Admin only.
 *
 * Query params:
 *   page     number  (default 1)
 *   limit    number  (default 20, max 100)
 *   search   string  (name or email ilike)
 *   status   string  (active|lapsed|cancelled|inactive|all)
 */

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { requireAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const cookieStore = await cookies()
    try {
      await requireAdmin(cookieStore)
    } catch (err) {
      return NextResponse.json(
        { error: err?.message ?? 'Forbidden' },
        { status: err?.status ?? 403 }
      )
    }

    // ── Parse params ────────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url)
    const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10))
    const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const search = searchParams.get('search')?.trim() ?? ''
    const status = searchParams.get('status') ?? 'all'
    const offset = (page - 1) * limit

    // ── Build base query for profiles ────────────────────────────────────────
    let query = supabaseAdmin
      .from('profiles')
      .select(
        'id, full_name, email, avatar_url, created_at',
        { count: 'exact' }
      )

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: profiles, count, error: profileError } = await query

    if (profileError) {
      console.error('GET /api/admin/users profiles error:', profileError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ users: [], total: 0, page, limit })
    }

    const userIds = profiles.map((p) => p.id)

    // ── Fetch subscriptions for these users ──────────────────────────────────
    const { data: subscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, plan, status, current_period_end')
      .in('user_id', userIds)
      .order('status',     { ascending: true  })
      .order('created_at', { ascending: false })

    // Keep only the best sub per user (active before others)
    const subByUser = {}
    for (const sub of subscriptions ?? []) {
      if (!subByUser[sub.user_id]) subByUser[sub.user_id] = sub
    }

    // ── Fetch score counts ────────────────────────────────────────────────────
    const { data: scoreCounts } = await supabaseAdmin
      .from('scores')
      .select('user_id')
      .in('user_id', userIds)

    const scoreCountByUser = {}
    for (const s of scoreCounts ?? []) {
      scoreCountByUser[s.user_id] = (scoreCountByUser[s.user_id] ?? 0) + 1
    }

    // ── Build user list ───────────────────────────────────────────────────────
    let users = profiles.map((p) => {
      const sub = subByUser[p.id] ?? null
      return {
        id:                 p.id,
        full_name:          p.full_name,
        email:              p.email,
        avatar_url:         p.avatar_url,
        joined_at:          p.created_at,
        subscription_status: sub?.status ?? null,
        subscription_plan:   sub?.plan   ?? null,
        period_end:          sub?.current_period_end ?? null,
        score_count:         scoreCountByUser[p.id] ?? 0,
      }
    })

    // ── Filter by subscription status (post-fetch) ────────────────────────────
    if (status !== 'all') {
      users = users.filter((u) => u.subscription_status === status)
    }

    return NextResponse.json({
      users,
      total: status === 'all' ? (count ?? users.length) : users.length,
      page,
      limit,
    })
  } catch (err) {
    console.error('GET /api/admin/users error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
