/**
 * @fileoverview Independent charity donation endpoint.
 *
 * POST /api/charities/donate
 * Authenticated. Creates a one-off donation record in charity_contributions
 * with is_independent = true (not tied to a subscription payment).
 *
 * Body: { charityId: string, amount: number }
 * amount must be > 0.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * POST /api/charities/donate
 *
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)

    // ── Auth ──────────────────────────────────────────────────────────────────
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

    const { charityId, amount } = body

    if (!charityId || typeof charityId !== 'string') {
      return NextResponse.json({ error: 'charityId is required' }, { status: 400 })
    }

    const amountNum = Number(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'amount must be a number greater than 0' },
        { status: 400 }
      )
    }

    // ── Verify charity is active ──────────────────────────────────────────────
    const { data: charity, error: charityError } = await supabase
      .from('charities')
      .select('id, name')
      .eq('id', charityId)
      .eq('is_active', true)
      .maybeSingle()

    if (charityError) {
      console.error('POST /api/charities/donate charity check error:', charityError)
      return NextResponse.json({ error: 'Failed to verify charity' }, { status: 500 })
    }

    if (!charity) {
      return NextResponse.json({ error: 'Charity not found' }, { status: 404 })
    }

    // ── Record the contribution ───────────────────────────────────────────────
    const { data: contribution, error: insertError } = await supabase
      .from('charity_contributions')
      .insert({
        user_id:        user.id,
        charity_id:     charityId,
        percentage:     0,      // not applicable for one-off donations
        amount:         amountNum,
        is_independent: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('POST /api/charities/donate insert error:', insertError)
      return NextResponse.json({ error: 'Failed to record donation' }, { status: 500 })
    }

    return NextResponse.json(
      {
        contribution,
        message: `Thank you for donating to ${charity.name}!`,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('POST /api/charities/donate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
