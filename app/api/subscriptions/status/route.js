/**
 * @fileoverview GET /api/subscriptions/status
 *
 * Returns the current user's full subscription record plus derived fields:
 *  - days_remaining: days until the current period ends
 *  - subscribed: boolean convenience flag
 *
 * Returns { subscribed: false } when no subscription exists.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * GET /api/subscriptions/status
 *
 * @returns {Promise<NextResponse>}
 */
export async function GET() {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // ── Fetch subscription ────────────────────────────────────────────────────
    // Prefer the most-recent active subscription; if none, take the most-recent row.
    // .order + .limit(1) ensures PostgREST returns at most one row so
    // .maybeSingle() never throws PGRST116 when duplicate rows exist.
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select(
        'id, plan, status, current_period_start, current_period_end, ' +
        'stripe_subscription_id, stripe_customer_id, cancelled_at'
      )
      .eq('user_id', user.id)
      .order('status',     { ascending: true  }) // 'active' sorts before 'cancelled'/'inactive'/'lapsed'
      .order('created_at', { ascending: false })  // newest first within same status
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('GET /api/subscriptions/status DB error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subscription status' },
        { status: 500 }
      )
    }

    // ── No subscription found ─────────────────────────────────────────────────
    if (!subscription) {
      return NextResponse.json({ subscribed: false })
    }

    // ── Derive computed fields ────────────────────────────────────────────────
    const isActive = subscription.status === 'active'

    let daysRemaining = null
    if (subscription.current_period_end) {
      const periodEnd = new Date(subscription.current_period_end)
      const msRemaining = periodEnd.getTime() - Date.now()
      daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
    }

    return NextResponse.json({
      subscribed: isActive,
      status: subscription.status,
      plan: subscription.plan,
      current_period_end: subscription.current_period_end,
      current_period_start: subscription.current_period_start,
      cancelled_at: subscription.cancelled_at,
      stripe_customer_id: subscription.stripe_customer_id,
      stripe_subscription_id: subscription.stripe_subscription_id,
      days_remaining: daysRemaining,
    })
  } catch (err) {
    console.error('GET /api/subscriptions/status error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
