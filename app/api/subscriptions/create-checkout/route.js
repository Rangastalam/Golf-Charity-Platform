/**
 * @fileoverview POST /api/subscriptions/create-checkout
 *
 * Creates a Stripe Checkout Session for a new subscription.
 * Accepts { plan: 'monthly' | 'yearly' } in the request body.
 *
 * Flow:
 *  1. Authenticate the request
 *  2. Look up or create a Stripe Customer for the user
 *  3. Create a Stripe Checkout Session in subscription mode
 *  4. Persist the stripe_customer_id so future calls re-use the same customer
 *  5. Return { url } — the hosted Stripe Checkout URL
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'
import { PLANS, ROUTES } from '@/constants'

/**
 * POST /api/subscriptions/create-checkout
 *
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
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

    // ── Parse body ────────────────────────────────────────────────────────────
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { plan } = body

    if (!plan || !PLANS[plan]) {
      return NextResponse.json(
        { error: 'plan must be "monthly" or "yearly"' },
        { status: 400 }
      )
    }

    // Resolve Stripe price ID server-side — these vars are not exposed to the client
    const priceIdByPlan = {
      monthly: process.env.STRIPE_PRICE_MONTHLY,
      yearly:  process.env.STRIPE_PRICE_YEARLY,
    }
    const priceId = priceIdByPlan[plan]
    if (!priceId) {
      console.error(`Missing env var for plan "${plan}" — set STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY`)
      return NextResponse.json(
        { error: 'Pricing not configured — contact support' },
        { status: 500 }
      )
    }

    // ── Guard: reject if user already has an active subscription ─────────────
    const { data: activeCheck } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (activeCheck) {
      return NextResponse.json(
        { error: 'You already have an active subscription. Manage it from your account settings.' },
        { status: 409 }
      )
    }

    // ── Create or retrieve Stripe Customer ────────────────────────────────────
    let stripeCustomerId = null

    // Check if the user already has a Stripe customer on record
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingSubscription?.stripe_customer_id) {
      stripeCustomerId = existingSubscription.stripe_customer_id
    } else {
      // Create a new Stripe Customer — attach the user ID in metadata so we
      // can look them up from webhook events without another DB round-trip.
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      })
      stripeCustomerId = customer.id

      // Persist the customer ID immediately so concurrent requests don't
      // accidentally create duplicate customers.
      const { error: upsertError } = await supabaseAdmin
        .from('subscriptions')
        .upsert(
          { user_id: user.id, stripe_customer_id: stripeCustomerId },
          { onConflict: 'user_id' }
        )

      if (upsertError) {
        console.error('Failed to persist stripe_customer_id:', upsertError)
        // Non-fatal — the checkout session still works; we'll pick it up from
        // the webhook.
      }
    }

    // ── Create Checkout Session ───────────────────────────────────────────────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: plan,
        },
      },
      metadata: {
        userId: user.id,
        plan: plan,
      },
      success_url: `${appUrl}${ROUTES.DASHBOARD}?subscription=success`,
      cancel_url: `${appUrl}${ROUTES.PRICING}`,
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('POST /api/subscriptions/create-checkout error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
