/**
 * @fileoverview POST /api/subscriptions/sync
 *
 * Bridges the gap between a successful Stripe Checkout redirect and the
 * asynchronous webhook that normally provisions the subscription record.
 *
 * Called client-side immediately after the user lands on
 * /dashboard?subscription=success.  It pulls the live subscription state
 * directly from the Stripe API and upserts it into the local DB, so the user
 * can start using subscription-gated features without waiting for the webhook.
 *
 * The webhook remains the authoritative source of truth for all subsequent
 * state changes (renewals, cancellations, etc.).  This route is only for the
 * initial post-checkout window.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'
import { PLANS } from '@/constants'

/** Maps Stripe subscription statuses to our enum */
const STATUS_MAP = {
  active:              'active',
  trialing:            'active',
  past_due:            'lapsed',
  unpaid:              'lapsed',
  incomplete:          'inactive',
  incomplete_expired:  'cancelled',
  canceled:            'cancelled',
  paused:              'inactive',
}

/**
 * POST /api/subscriptions/sync
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

    // ── Find the Stripe customer ID ───────────────────────────────────────────
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let stripeCustomerId = existing?.stripe_customer_id

    // If no customer ID on record, search Stripe by email as a fallback
    if (!stripeCustomerId) {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      })
      stripeCustomerId = customers.data[0]?.id ?? null
    }

    if (!stripeCustomerId) {
      // No Stripe customer found at all — nothing to sync
      return NextResponse.json({ synced: false, subscribed: false })
    }

    // ── Fetch the most recent active/trialing subscription from Stripe ────────
    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 5,
      expand: ['data.items.data.price'],
    })

    // Prefer active/trialing, fall back to the most recent regardless of status
    const stripeSub =
      stripeSubscriptions.data.find((s) =>
        ['active', 'trialing'].includes(s.status)
      ) ?? stripeSubscriptions.data[0] ?? null

    if (!stripeSub) {
      return NextResponse.json({ synced: false, subscribed: false })
    }

    // ── Derive plan from the price ID ─────────────────────────────────────────
    const priceId = stripeSub.items.data[0]?.price?.id
    const matchedPlan = priceId
      ? Object.values(PLANS).find(
          (p) => process.env[p.stripePriceEnvKey] === priceId
        )
      : null

    // Fall back to metadata if the price doesn't match a known env var
    const plan =
      matchedPlan?.id ??
      stripeSub.metadata?.plan ??
      existing?.plan ??
      'monthly'

    const mappedStatus = STATUS_MAP[stripeSub.status] ?? 'inactive'

    // ── Upsert into our DB (admin client — bypasses RLS) ─────────────────────
    const upsertPayload = {
      user_id:                user.id,
      stripe_customer_id:     stripeCustomerId,
      stripe_subscription_id: stripeSub.id,
      plan,
      status:                 mappedStatus,
      current_period_start:   new Date(stripeSub.current_period_start * 1000).toISOString(),
      current_period_end:     new Date(stripeSub.current_period_end   * 1000).toISOString(),
    }

    // If there's already a row for this user, update it; otherwise insert.
    // We avoid onConflict on user_id because the schema may not have a
    // unique constraint — use stripe_subscription_id as the conflict target
    // if a prior row with that sub ID exists, otherwise insert fresh.
    const { data: existingBySub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', stripeSub.id)
      .maybeSingle()

    if (existingBySub) {
      await supabaseAdmin
        .from('subscriptions')
        .update(upsertPayload)
        .eq('stripe_subscription_id', stripeSub.id)
    } else if (existing) {
      // Update the existing user row (matched by user_id)
      await supabaseAdmin
        .from('subscriptions')
        .update(upsertPayload)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
    } else {
      // No row at all — insert fresh
      await supabaseAdmin.from('subscriptions').insert(upsertPayload)
    }

    return NextResponse.json({
      synced:     true,
      subscribed: mappedStatus === 'active',
      plan,
      status:     mappedStatus,
    })
  } catch (err) {
    console.error('POST /api/subscriptions/sync error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
