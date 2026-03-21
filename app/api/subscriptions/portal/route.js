/**
 * @fileoverview POST /api/subscriptions/portal
 *
 * Creates a Stripe Customer Portal session so the user can manage or cancel
 * their subscription without leaving the site.
 *
 * Returns { url } — redirect the browser to this URL.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { ROUTES } from '@/constants'

/**
 * POST /api/subscriptions/portal
 *
 * @returns {Promise<NextResponse>}
 */
export async function POST() {
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

    // ── Look up the Stripe Customer ID ────────────────────────────────────────
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (subError) {
      console.error('POST /api/subscriptions/portal DB error:', subError)
      return NextResponse.json(
        { error: 'Failed to retrieve subscription details' },
        { status: 500 }
      )
    }

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe first.' },
        { status: 404 }
      )
    }

    // ── Create Customer Portal session ────────────────────────────────────────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}${ROUTES.DASHBOARD}`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err) {
    console.error('POST /api/subscriptions/portal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
