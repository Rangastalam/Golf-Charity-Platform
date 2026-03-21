/**
 * @fileoverview Notification preferences API.
 *
 * GET /api/notifications/preferences  — returns current preferences
 * PUT /api/notifications/preferences  — merges and saves preferences
 *
 * Stored in profiles.notification_preferences JSONB.
 * Schema migration (run once in Supabase SQL editor):
 *
 *   ALTER TABLE profiles
 *   ADD COLUMN IF NOT EXISTS notification_preferences JSONB
 *   DEFAULT '{
 *     "draw_results": true,
 *     "winner_alerts": true,
 *     "system_updates": true,
 *     "charity_updates": true
 *   }'::jsonb;
 */

import { NextResponse }               from 'next/server'
import { cookies }                    from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { supabaseAdmin }              from '@/lib/supabase-admin'

const DEFAULTS = {
  draw_results:   true,
  winner_alerts:  true,
  system_updates: true,
  charity_updates: true,
}

const ALLOWED_KEYS = new Set(Object.keys(DEFAULTS))

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase    = createServerSupabaseClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('notification_preferences')
      .eq('id', user.id)
      .maybeSingle()

    if (error) throw error

    const prefs = { ...DEFAULTS, ...(profile?.notification_preferences ?? {}) }
    return NextResponse.json({ preferences: prefs })
  } catch (err) {
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────

export async function PUT(req) {
  try {
    const cookieStore = await cookies()
    const supabase    = createServerSupabaseClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await req.json()

    // Only allow known keys; winner_alerts cannot be disabled (critical)
    const updates = {}
    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_KEYS.has(key)) continue
      if (key === 'winner_alerts') continue   // always true — can't opt out
      updates[key] = Boolean(value)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid preference keys provided' }, { status: 400 })
    }

    // Fetch existing prefs to merge
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('notification_preferences')
      .eq('id', user.id)
      .maybeSingle()

    const existing = profile?.notification_preferences ?? {}
    const merged   = { ...DEFAULTS, ...existing, ...updates, winner_alerts: true }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ notification_preferences: merged })
      .eq('id', user.id)

    if (updateError) throw updateError

    return NextResponse.json({ preferences: merged })
  } catch (err) {
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}
