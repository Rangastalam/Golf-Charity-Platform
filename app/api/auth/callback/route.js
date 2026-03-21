/**
 * @fileoverview Supabase Auth callback handler for OAuth flows.
 * Exchanges the auth code for a session then redirects the user.
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ROUTES } from '@/constants'

/**
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<NextResponse>}
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectTo = searchParams.get('redirectTo') ?? ROUTES.DASHBOARD
  const next = redirectTo.startsWith('/') ? redirectTo : ROUTES.DASHBOARD

  if (!code) {
    console.error('Auth callback: no code param received')
    return NextResponse.redirect(
      new URL(`${ROUTES.LOGIN}?error=no_code`, origin)
    )
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Auth callback: code exchange failed', error.message)
    return NextResponse.redirect(
      new URL(`${ROUTES.LOGIN}?error=exchange_failed`, origin)
    )
  }

  return NextResponse.redirect(new URL(next, origin))
}
