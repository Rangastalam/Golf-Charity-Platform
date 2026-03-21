/**
 * @fileoverview Supabase client exports — safe to import anywhere.
 *
 * Two clients live here (both use only NEXT_PUBLIC_* env vars):
 *
 *   supabase                          Browser client ('use client' components)
 *   createServerSupabaseClient(store) Server client  (Server Components, Route Handlers)
 *
 * The service-role admin client lives in lib/supabase-admin.js.
 * Never import that file from a Client Component.
 */

import { createBrowserClient, createServerClient } from '@supabase/ssr'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL)  throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL')
if (!SUPABASE_ANON) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY')

// ─── 1. Browser client ────────────────────────────────────────────────────────
// Singleton for use in 'use client' components.
// Stores session in cookies (SSR-safe, no localStorage).
//
// Usage:
//   import { supabase } from '@/lib/supabase'

export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

// ─── 2. Server client factory ─────────────────────────────────────────────────
// Call this in Server Components, Route Handlers, and lib/auth.js helpers.
// The caller must supply the awaited cookie store from next/headers.
//
// Usage (Route Handler / Server Component):
//   import { cookies } from 'next/headers'
//   import { createServerSupabaseClient } from '@/lib/supabase'
//
//   const cookieStore = await cookies()
//   const supabase    = createServerSupabaseClient(cookieStore)

/**
 * Creates a Supabase server client that reads and writes the session cookie.
 *
 * @param {import('next/headers').ReadonlyRequestCookies} cookieStore
 *   The resolved value of `await cookies()` from `next/headers`.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createServerSupabaseClient(cookieStore) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Swallow in Server Components — session refresh is handled by middleware.
        }
      },
    },
  })
}

// Admin client → import from lib/supabase-admin.js (server-only)
