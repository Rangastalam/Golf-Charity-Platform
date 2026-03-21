/**
 * @fileoverview Notification trigger functions — called from API routes and webhooks.
 *
 * Each function fetches what it needs, checks preferences, and dispatches email(s).
 * Never throws — all errors are caught and logged.
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail }     from '@/lib/email'
import {
  welcomeEmail,
  subscriptionConfirmEmail,
  subscriptionCancelledEmail,
  subscriptionLapsedEmail,
  drawResultsEmail,
  winnerAlertEmail,
  proofVerifiedEmail,
  paymentSentEmail,
  charityContributionEmail,
} from '@/lib/emailTemplates'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://golfgives.com'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetches a user's profile (email + full_name + notification_preferences).
 * @param {string} userId
 * @returns {Promise<{email:string, full_name:string|null, notification_preferences:object}|null>}
 */
async function getProfile(userId) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('email, full_name, notification_preferences')
    .eq('id', userId)
    .maybeSingle()
  return data ?? null
}

/**
 * Returns true if the user wants to receive this notification type.
 * Critical emails (winner_alerts, payment) always send regardless of prefs.
 *
 * @param {object|null} prefs
 * @param {string} type
 * @param {boolean} [critical]
 */
function shouldSend(prefs, type, critical = false) {
  if (critical) return true
  if (!prefs)   return true          // default: send everything
  return prefs[type] !== false       // only block if explicitly false
}

function displayName(profile) {
  return profile?.full_name || profile?.email?.split('@')[0] || 'there'
}

function formatMonth(monthStr) {
  const [y, m] = (monthStr ?? '').split('-')
  if (!y || !m) return monthStr ?? ''
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Triggers ────────────────────────────────────────────────────────────────

/**
 * Called after a new user signs up.
 * @param {{ id: string, email: string, user_metadata?: object }} user
 */
export async function onUserSignup(user) {
  try {
    const name   = user.user_metadata?.full_name ?? user.email.split('@')[0]
    const tpl    = welcomeEmail({ userName: name, loginUrl: `${BASE_URL}/dashboard` })
    const result = await sendEmail({ to: user.email, ...tpl })
    if (!result.success) {
      console.error('[notify] onUserSignup: sendEmail failed:', result.error)
    }
    return result
  } catch (err) {
    console.error('[notify] onUserSignup error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Called after a Stripe checkout.session.completed webhook.
 * @param {{ user_id: string, plan: string, current_period_end: string }} subscription
 */
export async function onSubscriptionCreated(subscription) {
  try {
    const profile = await getProfile(subscription.user_id)
    if (!profile) return

    // Fetch user's selected charity
    const { data: charityPref } = await supabaseAdmin
      .from('user_charity_preferences')
      .select('charity_id, charities(name)')
      .eq('user_id', subscription.user_id)
      .maybeSingle()

    const charityName          = charityPref?.charities?.name ?? 'your selected charity'
    const contributionAmount   = Math.round((subscription.priceCents ?? 999) * 0.4)

    const tpl = subscriptionConfirmEmail({
      userName:           displayName(profile),
      plan:               subscription.plan ?? 'Monthly',
      renewalDate:        formatDate(subscription.current_period_end),
      charityName,
      contributionAmount,
    })
    await sendEmail({ to: profile.email, ...tpl })
  } catch (err) {
    console.error('[notify] onSubscriptionCreated error:', err)
  }
}

/**
 * Called after customer.subscription.deleted webhook.
 * @param {{ user_id?: string, stripe_subscription_id: string }} subscription
 */
export async function onSubscriptionCancelled(subscription) {
  try {
    const userId = subscription.user_id
    if (!userId) return

    const profile = await getProfile(userId)
    if (!profile) return

    if (!shouldSend(profile.notification_preferences, 'system_updates')) return

    const tpl = subscriptionCancelledEmail({
      userName: displayName(profile),
      endDate:  formatDate(subscription.current_period_end),
    })
    await sendEmail({ to: profile.email, ...tpl })
  } catch (err) {
    console.error('[notify] onSubscriptionCancelled error:', err)
  }
}

/**
 * Called after invoice.payment_failed webhook.
 * @param {{ user_id?: string }} subscription
 */
export async function onSubscriptionLapsed(subscription) {
  try {
    const userId = subscription.user_id
    if (!userId) return

    const profile = await getProfile(userId)
    if (!profile) return

    if (!shouldSend(profile.notification_preferences, 'system_updates')) return

    const tpl = subscriptionLapsedEmail({
      userName:       displayName(profile),
      resubscribeUrl: `${BASE_URL}/pricing`,
    })
    await sendEmail({ to: profile.email, ...tpl })
  } catch (err) {
    console.error('[notify] onSubscriptionLapsed error:', err)
  }
}

/**
 * Called after a draw is published.
 * Sends personalised draw result emails to all entered users.
 * Sends winner alert emails to winners.
 *
 * @param {{ id: string, month: string, drawn_numbers: number[] }} draw
 */
export async function onDrawPublished(draw) {
  try {
    // Fetch all draw entries with user profiles
    const { data: entries } = await supabaseAdmin
      .from('draw_entries')
      .select('user_id, profiles(email, full_name, notification_preferences)')
      .eq('draw_id', draw.id)

    if (!entries?.length) return

    // Fetch winners for this draw
    const { data: winners } = await supabaseAdmin
      .from('winners')
      .select('user_id, match_type, prize_amount')
      .eq('draw_id', draw.id)

    const winnerMap = new Map((winners ?? []).map((w) => [w.user_id, w]))

    const month        = formatMonth(draw.month)
    const nextDrawDate = getNextDrawDate()

    // Send to all entries in parallel (batched to avoid rate limits)
    const BATCH = 10
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH)
      await Promise.all(batch.map(async (entry) => {
        const profile = entry.profiles
        if (!profile?.email) return

        if (!shouldSend(profile.notification_preferences, 'draw_results')) return

        const winner      = winnerMap.get(entry.user_id)
        const matchResult = winner?.match_type ?? null
        const prizeAmount = winner?.prize_amount ?? 0

        const tpl = drawResultsEmail({
          userName:     displayName(profile),
          month,
          drawnNumbers: draw.drawn_numbers ?? [],
          matchResult,
          prizeAmount,
          nextDrawDate,
        })
        await sendEmail({ to: profile.email, ...tpl })
      }))
    }

    // Send winner alert emails to winners (critical — always send)
    await Promise.all((winners ?? []).map(async (winner) => {
      const profile = await getProfile(winner.user_id)
      if (!profile?.email) return

      const tpl = winnerAlertEmail({
        userName:      displayName(profile),
        matchType:     winner.match_type,
        prizeAmount:   winner.prize_amount,
        uploadProofUrl: `${BASE_URL}/dashboard`,
      })
      await sendEmail({ to: profile.email, ...tpl })
    }))
  } catch (err) {
    console.error('[notify] onDrawPublished error:', err)
  }
}

/**
 * Called after admin verifies a winner's proof.
 * @param {{ id: string, user_id: string, prize_amount: number }} winner
 */
export async function onProofVerified(winner) {
  try {
    const profile = await getProfile(winner.user_id)
    if (!profile?.email) return
    // Critical — always send
    const tpl = proofVerifiedEmail({
      userName:    displayName(profile),
      prizeAmount: winner.prize_amount,
    })
    await sendEmail({ to: profile.email, ...tpl })
  } catch (err) {
    console.error('[notify] onProofVerified error:', err)
  }
}

/**
 * Called after admin marks a winner as paid.
 * @param {{ id: string, user_id: string, prize_amount: number }} winner
 */
export async function onPaymentSent(winner) {
  try {
    const profile = await getProfile(winner.user_id)
    if (!profile?.email) return
    // Critical — always send
    const tpl = paymentSentEmail({
      userName:         displayName(profile),
      prizeAmount:      winner.prize_amount,
      paymentReference: `GG-${winner.id.slice(0, 8).toUpperCase()}`,
    })
    await sendEmail({ to: profile.email, ...tpl })
  } catch (err) {
    console.error('[notify] onPaymentSent error:', err)
  }
}

/**
 * Called from monthly subscription renewal (invoice.payment_succeeded on renewal).
 * @param {{ id: string }} user
 * @param {{ name: string }} charity
 * @param {number} amount
 * @param {string} monthStr  e.g. '2025-06'
 */
export async function onMonthlyContribution(user, charity, amount, monthStr) {
  try {
    const profile = await getProfile(user.id)
    if (!profile?.email) return

    if (!shouldSend(profile.notification_preferences, 'charity_updates')) return

    const tpl = charityContributionEmail({
      userName:           displayName(profile),
      charityName:        charity.name,
      contributionAmount: amount,
      month:              formatMonth(monthStr),
    })
    await sendEmail({ to: profile.email, ...tpl })
  } catch (err) {
    console.error('[notify] onMonthlyContribution error:', err)
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function getNextDrawDate() {
  const now  = new Date()
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()
  const mon  = (now.getMonth() + 1) % 12
  return new Date(year, mon, 28).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
