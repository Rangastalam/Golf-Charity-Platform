/**
 * @fileoverview Auth REST endpoints.
 *
 * GET  /api/auth  — returns the current authenticated user
 * DELETE /api/auth — signs the user out and clears the session
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * GET /api/auth
 * Returns the currently authenticated user or 401.
 *
 * @returns {Promise<NextResponse>}
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role ?? 'member',
        displayName: user.user_metadata?.display_name ?? null,
      },
    })
  } catch (err) {
    console.error('GET /api/auth error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/auth
 * Signs the user out and invalidates the session.
 *
 * @returns {Promise<NextResponse>}
 */
export async function DELETE() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign-out error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/auth error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
