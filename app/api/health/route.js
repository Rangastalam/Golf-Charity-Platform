/**
 * @fileoverview GET /api/health
 *
 * Public health-check endpoint.
 * Verifies connectivity to Supabase and Stripe and returns latency metrics.
 * Intended for uptime monitors (e.g. BetterUptime, UptimeRobot).
 *
 * Response shape:
 *   {
 *     status:       'healthy' | 'degraded',
 *     supabase:     'connected' | 'error',
 *     stripe:       'connected' | 'error',
 *     timestamp:    ISO string,
 *     responseTime: ms (total handler duration),
 *   }
 *
 * HTTP status: 200 when healthy, 503 when degraded.
 */

import { NextResponse }   from 'next/server'
import { supabaseAdmin }  from '@/lib/supabase-admin'
import { stripe }         from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 *
 * @returns {Promise<NextResponse>}
 */
export async function GET() {
  const start = Date.now()

  // ── Check Supabase ─────────────────────────────────────────────────────────
  let supabaseStatus = 'connected'
  try {
    // Lightweight query — count rows in a small system table
    const { error } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (error) {
      console.error('[health] Supabase check error:', error.message)
      supabaseStatus = 'error'
    }
  } catch (err) {
    console.error('[health] Supabase check threw:', err.message)
    supabaseStatus = 'error'
  }

  // ── Check Stripe ───────────────────────────────────────────────────────────
  let stripeStatus = 'connected'
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      stripeStatus = 'error'
    } else {
      // Lightweight API call — retrieve the balance (read-only, fast)
      await stripe.balance.retrieve()
    }
  } catch (err) {
    console.error('[health] Stripe check threw:', err.message)
    stripeStatus = 'error'
  }

  // ── Build response ─────────────────────────────────────────────────────────
  const isHealthy   = supabaseStatus === 'connected' && stripeStatus === 'connected'
  const responseTime = Date.now() - start

  return NextResponse.json(
    {
      status:       isHealthy ? 'healthy' : 'degraded',
      supabase:     supabaseStatus,
      stripe:       stripeStatus,
      timestamp:    new Date().toISOString(),
      responseTime,
    },
    { status: isHealthy ? 200 : 503 }
  )
}
