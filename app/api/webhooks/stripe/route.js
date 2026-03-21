/**
 * @fileoverview POST /api/webhooks/stripe
 *
 * Verifies the Stripe webhook signature and dispatches to per-event handlers.
 *
 * Events handled:
 *  - checkout.session.completed       → provision subscription record
 *  - customer.subscription.updated    → sync status / period / cancellation flag
 *  - customer.subscription.deleted    → mark cancelled, clear profile tier
 *  - invoice.payment_succeeded        → refresh period dates, ensure active
 *  - invoice.payment_failed           → mark subscription as lapsed
 *
 * Uses the service-role Supabase client (bypasses RLS) because this handler
 * runs outside any user session.
 *
 * Stripe signature verification uses the raw request body — Next.js must NOT
 * parse it before we read it. The `dynamic = 'force-dynamic'` export prevents
 * any caching that could interfere.
 */

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PLANS } from '@/constants'
import {
  onSubscriptionCreated,
  onSubscriptionCancelled,
  onSubscriptionLapsed,
} from '@/lib/notificationTriggers'

export const dynamic = 'force-dynamic'

// ─── Status map ───────────────────────────────────────────────────────────────

/**
 * Maps Stripe subscription statuses to the platform's subscription_status enum.
 * @type {Object.<string, string>}
 */
const STRIPE_STATUS_MAP = {
  active: 'active',
  trialing: 'active',
  past_due: 'lapsed',
  unpaid: 'lapsed',
  incomplete: 'inactive',
  incomplete_expired: 'cancelled',
  canceled: 'cancelled',
  paused: 'inactive',
}

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/webhooks/stripe
 *
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  // Read raw body — must happen before any other body parsing
  const rawBody = await request.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Signature verification failed: ${err.message}` },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break

      default:
        // Acknowledge unhandled events so Stripe doesn't retry them
        break
    }
  } catch (err) {
    // Return 500 → Stripe will retry the event (up to its retry schedule)
    console.error(`Webhook handler error for ${event.type}:`, err.message)
    return NextResponse.json(
      { error: 'Webhook handler failed — will retry' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * Provisions the subscription record when a Checkout Session completes.
 * The session metadata must contain { userId, plan }.
 *
 * @param {import('stripe').Stripe.Checkout.Session} session
 */
async function handleCheckoutCompleted(session) {
  console.log('checkout.session.completed — session metadata:', session.metadata)
  console.log('checkout.session.completed — customer:', session.customer)
  console.log('checkout.session.completed — subscription:', session.subscription)

  const userId = session.metadata?.userId
  const plan   = session.metadata?.plan

  if (!userId) {
    console.error(
      'checkout.session.completed: userId missing from session metadata — cannot link subscription',
      { sessionId: session.id, metadata: session.metadata }
    )
    // Return without throwing so Stripe receives 200 and does not retry
    return
  }

  if (!plan || !PLANS[plan]) {
    console.error('checkout.session.completed: unknown or missing plan in metadata', { plan, sessionId: session.id })
    return
  }

  if (!session.subscription) {
    console.error(
      'checkout.session.completed: session has no subscription ID',
      { sessionId: session.id }
    )
    return
  }

  // Fetch full subscription details (period dates live on the sub, not the session)
  const stripeSubscription = await stripe.subscriptions.retrieve(
    /** @type {string} */ (session.subscription)
  )

  const mappedStatus = STRIPE_STATUS_MAP[stripeSubscription.status] ?? 'inactive'

  const { data, error } = await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: String(session.customer),
      stripe_subscription_id: stripeSubscription.id,
      plan,
      status: mappedStatus,
      current_period_start: new Date(
        stripeSubscription.current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        stripeSubscription.current_period_end * 1000
      ).toISOString(),
    },
    { onConflict: 'user_id' }
  )

  console.log('Subscription saved:', data)
  console.log('Subscription error:', error)

  if (error) {
    throw new Error(
      `checkout.session.completed: failed to upsert subscription for user ${userId}: ${error.message}`
    )
  }

  // Trigger confirmation email (non-blocking)
  const { data: subRecord } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, plan, current_period_end')
    .eq('user_id', userId)
    .maybeSingle()
  if (subRecord) {
    onSubscriptionCreated(subRecord).catch(() => null)
  }
}

/**
 * Syncs subscription status, period dates, and cancellation flag.
 * Handles plan upgrades/downgrades and payment method changes.
 *
 * @param {import('stripe').Stripe.Subscription} subscription
 */
async function handleSubscriptionUpdated(subscription) {
  const mappedStatus = STRIPE_STATUS_MAP[subscription.status] ?? 'inactive'

  // Derive plan from the price ID if possible (handles plan changes)
  const priceId = subscription.items.data[0]?.price?.id
  const priceIdToPlan = {
    [process.env.STRIPE_PRICE_MONTHLY]: 'monthly',
    [process.env.STRIPE_PRICE_YEARLY]:  'yearly',
  }
  const matchedPlan = priceId ? (priceIdToPlan[priceId] ?? null) : null

  /** @type {Record<string, unknown>} */
  const updates = {
    status: mappedStatus,
    current_period_start: new Date(
      subscription.current_period_start * 1000
    ).toISOString(),
    current_period_end: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
  }

  if (matchedPlan) {
    updates.plan = matchedPlan
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update(updates)
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    throw new Error(
      `subscription.updated: failed to update ${subscription.id}: ${error.message}`
    )
  }
}

/**
 * Marks a subscription as cancelled and nullifies the user's tier.
 *
 * @param {import('stripe').Stripe.Subscription} subscription
 */
async function handleSubscriptionDeleted(subscription) {
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'cancelled',
      plan: null,
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    throw new Error(
      `subscription.deleted: failed to cancel ${subscription.id}: ${error.message}`
    )
  }

  // No profile tier column to clear — plan lives on subscriptions only

  // Trigger cancellation email (non-blocking)
  const { data: subRecord } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, current_period_end')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()
  if (subRecord) {
    onSubscriptionCancelled(subRecord).catch(() => null)
  }
}

/**
 * Refreshes period dates and ensures status is active after a successful renewal.
 *
 * @param {import('stripe').Stripe.Invoice} invoice
 */
async function handlePaymentSucceeded(invoice) {
  if (!invoice.subscription) return

  // The invoice lines contain the new billing period
  const line = invoice.lines?.data?.[0]
  if (!line?.period) return

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: new Date(line.period.start * 1000).toISOString(),
      current_period_end: new Date(line.period.end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', String(invoice.subscription))

  if (error) {
    throw new Error(
      `invoice.payment_succeeded: failed to update subscription for invoice ${invoice.id}: ${error.message}`
    )
  }
}

/**
 * Marks a subscription as lapsed (access degraded, not yet cancelled).
 *
 * @param {import('stripe').Stripe.Invoice} invoice
 */
async function handlePaymentFailed(invoice) {
  if (!invoice.subscription) return

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'lapsed' })
    .eq('stripe_subscription_id', String(invoice.subscription))

  if (error) {
    throw new Error(
      `invoice.payment_failed: failed to lapse subscription for invoice ${invoice.id}: ${error.message}`
    )
  }

  // Trigger lapsed email (non-blocking)
  const { data: subRecord } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', String(invoice.subscription))
    .maybeSingle()
  if (subRecord) {
    onSubscriptionLapsed(subRecord).catch(() => null)
  }
}
