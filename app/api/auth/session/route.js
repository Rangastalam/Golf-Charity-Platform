/**
 * @fileoverview GET /api/auth/session
 *
 * Returns the current session state for the authenticated user:
 *   - user        (id, email)
 *   - profile     (full_name, email, avatar_url, is_admin)
 *   - subscription (status, plan, current_period_end)
 *   - is_admin    (boolean shortcut — mirrors profile.is_admin)
 *
 * Returns 401 if there is no active session.
 * Used by client components on initial load to hydrate auth state.
 */

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const result = await getCurrentUser(cookieStore)

    if (!result) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const { user, profile } = result

    // Fetch subscription in a separate query (may not exist for new users)
    const supabase = createServerSupabaseClient(cookieStore)

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(
        'id, status, plan, current_period_start, current_period_end, cancelled_at'
      )
      .eq('user_id', user.id)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      // PGRST116 = row not found — acceptable for users who haven't subscribed
      console.error('GET /api/auth/session: subscription fetch error', subError.message)
    }

    return NextResponse.json({
      user: {
        id:    user.id,
        email: user.email,
      },
      profile: {
        id:         profile.id,
        full_name:  profile.full_name,
        email:      profile.email,
        avatar_url: profile.avatar_url,
        is_admin:   profile.is_admin,
      },
      subscription: subscription ?? null,
      is_admin: profile.is_admin,
    })
  } catch (err) {
    console.error('GET /api/auth/session unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
