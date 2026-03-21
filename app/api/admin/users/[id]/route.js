/**
 * @fileoverview GET|PUT|DELETE /api/admin/users/[id]
 *
 * GET  — full user record: profile + subscription + scores + charity + wins
 * PUT  — update profile fields and/or subscription status override
 * DELETE — hard-delete user and all related data
 *
 * Admin only.
 */

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { requireAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ── Auth guard ────────────────────────────────────────────────────────────────

async function guardAdmin() {
  const cookieStore = await cookies()
  try {
    await requireAdmin(cookieStore)
  } catch (err) {
    return NextResponse.json(
      { error: err?.message ?? 'Forbidden' },
      { status: err?.status ?? 403 }
    )
  }
  return null
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request, { params }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params

  try {
    const [profileRes, subRes, scoresRes, charityRes, winnersRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, avatar_url, is_admin, created_at')
        .eq('id', id)
        .single(),

      supabaseAdmin
        .from('subscriptions')
        .select('id, plan, status, current_period_start, current_period_end, cancelled_at, stripe_customer_id, stripe_subscription_id')
        .eq('user_id', id)
        .order('status',     { ascending: true  })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabaseAdmin
        .from('scores')
        .select('id, gross_score, course_name, played_at, created_at')
        .eq('user_id', id)
        .order('played_at', { ascending: false }),

      supabaseAdmin
        .from('user_charity_selections')
        .select('contribution_percentage, charities(id, name, image_url)')
        .eq('user_id', id)
        .maybeSingle(),

      supabaseAdmin
        .from('winners')
        .select('id, match_type, prize_amount, payment_status, verified_at, paid_at, created_at, draws(month)')
        .eq('user_id', id)
        .order('created_at', { ascending: false }),
    ])

    if (profileRes.error || !profileRes.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      profile:      profileRes.data,
      subscription: subRes.data ?? null,
      scores:       scoresRes.data ?? [],
      charity:      charityRes.data ?? null,
      winners:      winnersRes.data ?? [],
    })
  } catch (err) {
    console.error('GET /api/admin/users/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── PUT ───────────────────────────────────────────────────────────────────────

export async function PUT(request, { params }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params

  try {
    const body = await request.json()
    const { full_name, email, subscription_status } = body

    const updates = []

    // Profile update
    if (full_name !== undefined || email !== undefined) {
      const profilePatch = {}
      if (full_name !== undefined) profilePatch.full_name = full_name.trim()
      if (email     !== undefined) profilePatch.email     = email.trim().toLowerCase()

      const { error } = await supabaseAdmin
        .from('profiles')
        .update(profilePatch)
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: 'Failed to update profile: ' + error.message }, { status: 500 })
      }
      updates.push('profile')
    }

    // Subscription status override
    if (subscription_status !== undefined) {
      const allowed = ['active', 'lapsed', 'cancelled', 'inactive']
      if (!allowed.includes(subscription_status)) {
        return NextResponse.json({ error: 'Invalid subscription status' }, { status: 400 })
      }

      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({ status: subscription_status })
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        return NextResponse.json({ error: 'Failed to update subscription: ' + error.message }, { status: 500 })
      }
      updates.push('subscription')
    }

    return NextResponse.json({ updated: updates })
  } catch (err) {
    console.error('PUT /api/admin/users/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request, { params }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params

  try {
    // Delete related data in dependency order
    const tables = [
      'winners',
      'draw_entries',
      'scores',
      'charity_contributions',
      'user_charity_selections',
      'subscriptions',
      'profiles',
    ]

    for (const table of tables) {
      const col = table === 'profiles' ? 'id' : 'user_id'
      const { error } = await supabaseAdmin.from(table).delete().eq(col, id)
      if (error) {
        console.error(`DELETE /api/admin/users/[id]: failed on ${table}:`, error)
        return NextResponse.json(
          { error: `Failed to delete from ${table}: ${error.message}` },
          { status: 500 }
        )
      }
    }

    // Delete the Supabase Auth user (requires service role)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (authError) {
      console.error('DELETE /api/admin/users/[id]: auth delete failed:', authError)
      // Profile data is already gone — log but don't fail the request
    }

    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error('DELETE /api/admin/users/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
