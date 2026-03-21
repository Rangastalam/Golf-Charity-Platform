/**
 * @fileoverview POST /api/notifications/send — admin manual email trigger.
 *
 * Body: { type: string, userId: string, data: object }
 * Returns: { success, messageId? }
 */

import { NextResponse }  from 'next/server'
import { cookies }       from 'next/headers'
import { requireAdmin }  from '@/lib/auth'
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

const ALLOWED_TYPES = [
  'welcome',
  'subscription_confirmed',
  'subscription_cancelled',
  'subscription_lapsed',
  'draw_results',
  'winner_alert',
  'proof_verified',
  'payment_sent',
  'charity_contribution',
]

export async function POST(req) {
  try {
    const cookieStore = await cookies()
    await requireAdmin(cookieStore)

    const body = await req.json()
    const { type, userId, data = {} } = body

    if (!type || !ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Fetch profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .maybeSingle()

    if (!profile?.email) {
      return NextResponse.json({ error: 'User not found or has no email' }, { status: 404 })
    }

    const userName = profile.full_name ?? profile.email.split('@')[0]

    // Build template
    let tpl
    switch (type) {
      case 'welcome':
        tpl = welcomeEmail({ userName, ...data })
        break
      case 'subscription_confirmed':
        tpl = subscriptionConfirmEmail({ userName, plan: 'Monthly', renewalDate: '—', charityName: '—', contributionAmount: 0, ...data })
        break
      case 'subscription_cancelled':
        tpl = subscriptionCancelledEmail({ userName, endDate: data.endDate ?? '—' })
        break
      case 'subscription_lapsed':
        tpl = subscriptionLapsedEmail({ userName, ...data })
        break
      case 'draw_results':
        tpl = drawResultsEmail({ userName, month: data.month ?? '—', drawnNumbers: data.drawnNumbers ?? [], matchResult: data.matchResult ?? null, prizeAmount: data.prizeAmount ?? 0, nextDrawDate: data.nextDrawDate ?? '—' })
        break
      case 'winner_alert':
        tpl = winnerAlertEmail({ userName, matchType: data.matchType ?? 'three_match', prizeAmount: data.prizeAmount ?? 0, uploadProofUrl: data.uploadProofUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` })
        break
      case 'proof_verified':
        tpl = proofVerifiedEmail({ userName, prizeAmount: data.prizeAmount ?? 0, paymentMethod: data.paymentMethod })
        break
      case 'payment_sent':
        tpl = paymentSentEmail({ userName, prizeAmount: data.prizeAmount ?? 0, paymentReference: data.paymentReference ?? '—' })
        break
      case 'charity_contribution':
        tpl = charityContributionEmail({ userName, charityName: data.charityName ?? '—', contributionAmount: data.contributionAmount ?? 0, month: data.month ?? '—' })
        break
      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
    }

    const result = await sendEmail({ to: profile.email, ...tpl })

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Send failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (err) {
    const status = err?.status === 401 ? 401 : err?.status === 403 ? 403 : 500
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status })
  }
}
