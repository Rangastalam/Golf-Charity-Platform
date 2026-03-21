/**
 * @fileoverview Subscription endpoints.
 *
 * GET  /api/subscriptions         — returns the current user's subscription
 * POST /api/subscriptions/checkout — creates a Stripe checkout session
 * POST /api/subscriptions/portal   — creates a Stripe billing portal session
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { SUBSCRIPTION_TIERS, ROUTES } from '@/constants'

/**
 * GET /api/subscriptions
 * Returns the current user's active subscription details.
 *
 * @returns {Promise<NextResponse>}
 */
export async function GET() {
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

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select(
        'id, plan, status, current_period_start, current_period_end, stripe_subscription_id, stripe_customer_id, cancelled_at'
      )
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('GET /api/subscriptions DB error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({ subscription: subscription ?? null })
  } catch (err) {
    console.error('GET /api/subscriptions error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/subscriptions
 * Dispatches to checkout or portal based on action field.
 * Body: { action: 'checkout' | 'portal', tierId?: string }
 *
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
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

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { action, tierId } = body

    if (action === 'checkout') {
      return handleCheckout(user, tierId)
    }
    if (action === 'portal') {
      return handlePortal(user, supabase)
    }

    return NextResponse.json(
      { error: 'action must be "checkout" or "portal"' },
      { status: 400 }
    )
  } catch (err) {
    console.error('POST /api/subscriptions error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

/**
 * Creates a Stripe Checkout session for a new subscription.
 *
 * @param {{ id: string, email: string }} user
 * @param {string} tierId
 * @returns {Promise<NextResponse>}
 */
async function handleCheckout(user, tierId) {
  const tier = Object.values(SUBSCRIPTION_TIERS).find((t) => t.id === tierId)
  if (!tier) {
    return NextResponse.json({ error: 'Invalid tierId' }, { status: 400 })
  }

  const priceId = process.env[tier.stripePriceEnvKey]
  if (!priceId) {
    console.error(`Missing env var: ${tier.stripePriceEnvKey}`)
    return NextResponse.json(
      { error: 'Subscription pricing not configured' },
      { status: 500 }
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      metadata: {
        userId: user.id,
        tierId: tier.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tierId: tier.id,
        },
      },
      success_url: `${appUrl}${ROUTES.DASHBOARD}?checkout=success`,
      cancel_url: `${appUrl}${ROUTES.DASHBOARD}?checkout=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout session error:', err.message)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

// ─── Customer Portal ──────────────────────────────────────────────────────────

/**
 * Creates a Stripe Customer Portal session for managing an existing subscription.
 *
 * @param {{ id: string }} user
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<NextResponse>}
 */
async function handlePortal(user, supabase) {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (error || !subscription?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No active subscription found' },
      { status: 404 }
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}${ROUTES.DASHBOARD}`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err) {
    console.error('Stripe portal session error:', err.message)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
