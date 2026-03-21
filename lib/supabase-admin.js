/**
 * @fileoverview Supabase service-role (admin) client.
 *
 * !! SERVER-ONLY — never import this in a Client Component or any file
 *    that is part of the browser bundle. It uses SUPABASE_SERVICE_ROLE_KEY
 *    which is intentionally absent from the client environment. !!
 *
 * The client bypasses all Row Level Security policies.
 *
 * Usage:
 *   import { supabaseAdmin } from '@/lib/supabase-admin'
 *
 * Only use in:
 *   - app/api/webhooks/stripe/route.js
 *   - Server-side admin API route handlers
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL')
}
if (!SUPABASE_SERVICE) {
  throw new Error(
    'Missing env: SUPABASE_SERVICE_ROLE_KEY — this file must only be ' +
    'imported in server-side code (Route Handlers, Server Actions). ' +
    'If you see this error on /login or another client route, you have ' +
    'imported this module from a Client Component or a shared lib file.'
  )
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
  auth: {
    autoRefreshToken: false,
    persistSession:   false,
  },
})
