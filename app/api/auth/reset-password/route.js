/**
 * @fileoverview POST /api/auth/reset-password
 *
 * Triggers a Supabase password-reset email.
 * Always returns a success response regardless of whether the email is
 * registered — this prevents account enumeration attacks.
 *
 * Body: { email: string }
 *
 * ─── Supabase Dashboard setup ────────────────────────────────────────────────
 * Authentication → URL Configuration → Redirect URLs — add:
 *   http://localhost:3000/reset-password
 *   https://<your-vercel-url>.vercel.app/reset-password
 * Site URL: http://localhost:3000
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse }  from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/** @param {import('next/server').NextRequest} request */
export async function POST(request) {
  // Use a consistent response so callers cannot distinguish "found" from "not found".
  const SUCCESS_RESPONSE = NextResponse.json({
    success: true,
    message: 'If this email exists you will receive a reset link.',
  })

  try {
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { email } = body

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo }
    )

    if (error) {
      // Log the real error server-side but never expose it to the client.
      console.error('POST /api/auth/reset-password Supabase error:', error.message)
    }

    // Always return success — do not reveal whether the email is registered.
    return SUCCESS_RESPONSE
  } catch (err) {
    console.error('POST /api/auth/reset-password error:', err)
    // Still return success to avoid enumeration.
    return SUCCESS_RESPONSE
  }
}
