/**
 * @fileoverview POST /api/auth/welcome
 *
 * Called client-side immediately after a successful supabase.auth.signUp().
 * Validates the user exists, then sends the welcome email via Resend.
 *
 * Not admin-gated — any authenticated or newly-created user may call this.
 * Rate-limited naturally by the signUp flow (one call per registration).
 *
 * Body: { userId: string }
 */

import { NextResponse }  from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { onUserSignup }  from '@/lib/notificationTriggers'

export async function POST(req) {
  try {
    const { userId } = await req.json()

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Verify the user actually exists (prevents spoofed calls)
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fire welcome email
    const result = await onUserSignup(user)

    return NextResponse.json({ success: true, email: user.email, emailResult: result })
  } catch (err) {
    // Non-fatal — signup already succeeded; don't surface this to the user
    console.error('[/api/auth/welcome] error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
