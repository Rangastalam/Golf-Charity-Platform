/**
 * @fileoverview Stripe webhook handler.
 *
 * Events handled:
 *  - checkout.session.completed      → provision subscription in DB
 *  - customer.subscription.updated   → sync tier/status changes
 *  - customer.subscription.deleted   → mark subscription as cancelled
 *  - invoice.payment_failed          → mark subscription as past_due
 *
 * This route must NOT use the Supabase server client (no cookies).
 * It uses the admin client (service role) to write directly to the DB.
 */

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SUBSCRIPTION_TIERS } from '@/constants'

// Disable body parsing — Stripe needs the raw body to verify the signature
export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks
 *
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event
  const rawBody = await request.text()

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    )
  }

  const adminClient = supabaseAdmin

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object, adminClient)
        break
      }
      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(event.data.object, adminClient)
        break
      }
      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object, adminClient)
        break
      }
      case 'invoice.payment_failed': {
        await handlePaymentFailed(event.data.object, adminClient)
        break
      }
      default:
        // Unhandled event — acknowledge to prevent Stripe retries
        break
    }
  } catch (err) {
    console.error(`Webhook handler error for event ${event.type}:`, err)
    // Return 500 so Stripe retries the event
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

/**
 * Provisions a new subscription record when checkout completes.
 *
 * @param {import('stripe').Stripe.Checkout.Session} session
 * @param {import('@supabase/supabase-js').SupabaseClient} adminClient
 */
async function handleCheckoutCompleted(session, adminClient) {
  const userId = session.metadata?.userId
  const tierId = session.metadata?.tierId

  if (!userId || !tierId) {
    console.error('checkout.session.completed: missing userId or tierId in metadata', {
      sessionId: session.id,
    })
    return
  }

  const tier = Object.values(SUBSCRIPTION_TIERS).find((t) => t.id === tierId)
  if (!tier) {
    console.error('checkout.session.completed: unknown tierId', tierId)
    return
  }

  // Retrieve the full subscription object from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(
    /** @type {string} */ (session.subscription)
  )

  const { error } = await adminClient.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_subscription_id: stripeSubscription.id,
      stripe_customer_id: stripeSubscription.customer,
      plan: tierId,
      status: stripeSubscription.status,
      current_period_start: new Date(
        stripeSubscription.current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        stripeSubscription.current_period_end * 1000
      ).toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    throw new Error(`Failed to upsert subscription for user ${userId}: ${error.message}`)
  }

  // No profile tier column to update — plan lives on subscriptions only
}

/**
 * Syncs subscription tier and status on plan change / renewal.
 *
 * @param {import('stripe').Stripe.Subscription} subscription
 * @param {import('@supabase/supabase-js').SupabaseClient} adminClient
 */
async function handleSubscriptionUpdated(subscription, adminClient) {
  const userId = subscription.metadata?.userId
  if (!userId) {
    console.error('customer.subscription.updated: no userId in metadata', {
      subscriptionId: subscription.id,
    })
    return
  }

  // Determine new tier from the price ID
  const priceId = subscription.items.data[0]?.price?.id
  const tier = Object.values(SUBSCRIPTION_TIERS).find(
    (t) => process.env[t.stripePriceEnvKey] === priceId
  )

  const updates = {
    status: subscription.status,
    current_period_start: new Date(
      subscription.current_period_start * 1000
    ).toISOString(),
    current_period_end: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
  }

  if (tier) {
    updates.plan = tier.id
  }

  const { error } = await adminClient
    .from('subscriptions')
    .update(updates)
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    throw new Error(
      `Failed to update subscription ${subscription.id}: ${error.message}`
    )
  }

  // Sync profile tier if it changed
  if (tier) {
    await adminClient
      .from('profiles')
      .update({ tier_id: tier.id })
      .eq('id', userId)
  }
}

/**
 * Marks a subscription as cancelled in the database.
 *
 * @param {import('stripe').Stripe.Subscription} subscription
 * @param {import('@supabase/supabase-js').SupabaseClient} adminClient
 */
async function handleSubscriptionDeleted(subscription, adminClient) {
  const { error } = await adminClient
    .from('subscriptions')
    .update({ status: 'cancelled', tier_id: null })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    throw new Error(
      `Failed to cancel subscription ${subscription.id}: ${error.message}`
    )
  }

  // Clear profile tier
  const userId = subscription.metadata?.userId
  if (userId) {
    await adminClient
      .from('profiles')
      .update({ tier_id: null })
      .eq('id', userId)
  }
}

/**
 * Marks a subscription as past_due on payment failure.
 *
 * @param {import('stripe').Stripe.Invoice} invoice
 * @param {import('@supabase/supabase-js').SupabaseClient} adminClient
 */
async function handlePaymentFailed(invoice, adminClient) {
  if (!invoice.subscription) return

  const { error } = await adminClient
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', invoice.subscription)

  if (error) {
    throw new Error(
      `Failed to mark subscription past_due for invoice ${invoice.id}: ${error.message}`
    )
  }
}
