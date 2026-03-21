/**
 * @fileoverview GET /api/admin/reports
 *
 * Returns aggregated metrics for the requested period.
 *
 * Query params:
 *   period  'current_month' | 'last_month' | 'last_3_months' | 'all_time'
 *           (default: 'current_month')
 */

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { requireAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ── Date helpers ──────────────────────────────────────────────────────────────

function periodDates(period) {
  const now   = new Date()
  const year  = now.getUTCFullYear()
  const month = now.getUTCMonth()

  switch (period) {
    case 'last_month': {
      const start = new Date(Date.UTC(year, month - 1, 1))
      const end   = new Date(Date.UTC(year, month, 1))
      return { start: start.toISOString(), end: end.toISOString() }
    }
    case 'last_3_months': {
      const start = new Date(Date.UTC(year, month - 3, 1))
      return { start: start.toISOString(), end: null }
    }
    case 'all_time': {
      return { start: null, end: null }
    }
    case 'current_month':
    default: {
      const start = new Date(Date.UTC(year, month, 1))
      return { start: start.toISOString(), end: null }
    }
  }
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    try {
      await requireAdmin(cookieStore)
    } catch (err) {
      return NextResponse.json(
        { error: err?.message ?? 'Forbidden' },
        { status: err?.status ?? 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') ?? 'current_month'
    const { start, end } = periodDates(period)

    // Helper: apply optional date range to a supabase query
    function withRange(query, col = 'created_at') {
      if (start) query = query.gte(col, start)
      if (end)   query = query.lt(col, end)
      return query
    }

    const [
      activeSubsRes,
      newSubsRes,
      cancelledSubsRes,
      revenueRes,
      prizeRes,
      charityRes,
      drawsRes,
      winnersRes,
      monthlySubsRes,
      charityDistRes,
    ] = await Promise.all([
      // Total active subscribers RIGHT NOW (no date filter)
      supabaseAdmin
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),

      // New subscriptions created in period
      withRange(
        supabaseAdmin
          .from('subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
      ).then ? // withRange returns a query object not a promise; wrap properly
        supabaseAdmin
          .from('subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .gte('created_at', start ?? '1970-01-01')
          .then((r) => r)
        : null,

      // Cancelled in period
      supabaseAdmin
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'cancelled')
        .gte('created_at', start ?? '1970-01-01'),

      // Revenue: sum priceCents of active subs created in period (proxy)
      // Real revenue comes from Stripe; here we count subscription rows
      supabaseAdmin
        .from('subscriptions')
        .select('plan')
        .eq('status', 'active')
        .gte('created_at', start ?? '1970-01-01'),

      // Prize pool total distributed in period
      supabaseAdmin
        .from('winners')
        .select('prize_amount')
        .eq('payment_status', 'paid')
        .gte('created_at', start ?? '1970-01-01'),

      // Charity contributions total in period
      supabaseAdmin
        .from('charity_contributions')
        .select('amount')
        .gte('created_at', start ?? '1970-01-01'),

      // Draws in period
      supabaseAdmin
        .from('draws')
        .select('id, status, month')
        .gte('created_at', start ?? '1970-01-01')
        .order('month', { ascending: false }),

      // All winners in period (for jackpot carryover count)
      supabaseAdmin
        .from('winners')
        .select('match_type')
        .gte('created_at', start ?? '1970-01-01'),

      // Monthly subscriber counts for chart (last 6 months)
      supabaseAdmin
        .from('subscriptions')
        .select('created_at, status')
        .eq('status', 'active')
        .order('created_at', { ascending: true }),

      // Charity contribution distribution
      supabaseAdmin
        .from('charity_contributions')
        .select('amount, charities(name)')
        .gte('created_at', start ?? '1970-01-01'),
    ])

    // ── Compute totals ────────────────────────────────────────────────────────

    const totalActive     = activeSubsRes.count ?? 0
    const newSubscribers  = newSubsRes?.count ?? 0
    const cancelled       = cancelledSubsRes.count ?? 0

    // Revenue: approximate from plan prices
    const PLAN_PRICES = { monthly: 999, yearly: 9999 }
    const totalRevenue = (revenueRes.data ?? []).reduce((sum, s) => {
      return sum + (PLAN_PRICES[s.plan] ?? 0)
    }, 0)

    const totalPrizeDistributed = (prizeRes.data ?? []).reduce(
      (sum, w) => sum + Number(w.prize_amount ?? 0), 0
    )

    const totalCharityContributions = (charityRes.data ?? []).reduce(
      (sum, c) => sum + Number(c.amount ?? 0), 0
    )

    const draws         = drawsRes.data ?? []
    const drawsRun      = draws.filter((d) => d.status === 'published').length
    const totalWinners  = (winnersRes.data ?? []).length
    const jackpotRollovers = draws.filter((d) => {
      // A jackpot rollover occurred if no five_match winner
      return d.status === 'published'
    }).length  // placeholder; exact carryover logic requires prize_pools join

    // ── Subscriber growth chart data (last 6 months) ──────────────────────────
    const allActiveSubs = monthlySubsRes.data ?? []
    const growthMap = {}
    for (let i = 5; i >= 0; i--) {
      const d   = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      growthMap[key] = 0
    }
    for (const sub of allActiveSubs) {
      const key = sub.created_at.slice(0, 7)
      if (key in growthMap) growthMap[key] += 1
    }
    const subscriberGrowth = Object.entries(growthMap).map(([month, count]) => ({
      month, count,
    }))

    // ── Charity distribution chart data ───────────────────────────────────────
    const charityMap = {}
    for (const c of charityDistRes.data ?? []) {
      const name = c.charities?.name ?? 'Other'
      charityMap[name] = (charityMap[name] ?? 0) + Number(c.amount ?? 0)
    }
    const charityDistribution = Object.entries(charityMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    return NextResponse.json({
      period,
      metrics: {
        totalActive,
        newSubscribers,
        cancelled,
        totalRevenue,
        totalPrizeDistributed,
        totalCharityContributions,
        drawsRun,
        totalWinners,
        jackpotRollovers,
      },
      subscriberGrowth,
      charityDistribution,
    })
  } catch (err) {
    console.error('GET /api/admin/reports error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
