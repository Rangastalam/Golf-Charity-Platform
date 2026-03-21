/**
 * @fileoverview Charity collection endpoints.
 *
 * GET  /api/charities  — public: list all active charities
 *                        ?search=name  filter by name (case-insensitive)
 *                        ?featured=true  only featured charities
 *                        Featured first, then alphabetical.
 *                        Each charity includes upcoming events.
 *
 * POST /api/charities  — admin: create a new charity
 *                        Body: { name, description?, image_url?, website_url?, is_featured? }
 */

import { NextResponse }               from 'next/server'
import { cookies }                    from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { supabaseAdmin }              from '@/lib/supabase-admin'
import { USER_ROLES }                 from '@/constants'
import { sanitizeString, sanitizeObject } from '@/lib/validation'

// ─── GET ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/charities
 *
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<NextResponse>}
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    // Sanitize query params — strip any HTML injection attempts
    const search   = sanitizeString(searchParams.get('search') ?? '', 100)
    const featured = searchParams.get('featured') === 'true'

    let query = supabaseAdmin
      .from('charities')
      .select(
        `id, name, description, image_url, website_url, is_featured, created_at,
         charity_events ( id, title, event_date )`
      )
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('name',        { ascending: true  })

    if (featured) {
      query = query.eq('is_featured', true)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: charities, error } = await query

    if (error) {
      console.error('GET /api/charities DB error:', error)
      return NextResponse.json({ error: 'Failed to fetch charities' }, { status: 500 })
    }

    // Keep only future events, sorted by date ascending
    const today    = new Date().toISOString().slice(0, 10)
    const enriched = (charities ?? []).map((c) => ({
      ...c,
      charity_events: (c.charity_events ?? [])
        .filter((e) => e.event_date >= today)
        .sort((a, b) => a.event_date.localeCompare(b.event_date)),
    }))

    return NextResponse.json({ charities: enriched })
  } catch (err) {
    console.error('GET /api/charities error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/charities
 * Admin only.
 *
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase    = createServerSupabaseClient(cookieStore)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    if (user.user_metadata?.role !== USER_ROLES.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // ── Sanitize and allow only known fields (prevent mass assignment) ─────────
    const cleaned = sanitizeObject(body, [
      'name', 'description', 'image_url', 'website_url', 'is_featured',
    ])

    // ── Validate required field ────────────────────────────────────────────────
    const name = sanitizeString(cleaned.name ?? '', 200)
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const description = cleaned.description
      ? sanitizeString(String(cleaned.description), 2000)
      : null

    // ── Validate URL fields (allow null/empty) ─────────────────────────────────
    const imageUrl   = validateOptionalUrl(cleaned.image_url)
    const websiteUrl = validateOptionalUrl(cleaned.website_url)

    if (imageUrl === false) {
      return NextResponse.json({ error: 'image_url must be a valid URL' }, { status: 400 })
    }
    if (websiteUrl === false) {
      return NextResponse.json({ error: 'website_url must be a valid URL' }, { status: 400 })
    }

    const { data: charity, error: insertError } = await supabaseAdmin
      .from('charities')
      .insert({
        name,
        description,
        image_url:   imageUrl   || null,
        website_url: websiteUrl || null,
        is_featured: Boolean(cleaned.is_featured),
        is_active:   true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('POST /api/charities insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create charity' }, { status: 500 })
    }

    return NextResponse.json({ charity }, { status: 201 })
  } catch (err) {
    console.error('POST /api/charities error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the sanitized URL string if valid, null if empty, or false if
 * a value was provided but is not a valid https URL.
 *
 * @param {unknown} value
 * @returns {string|null|false}
 */
function validateOptionalUrl(value) {
  if (!value) return null
  const s = sanitizeString(String(value), 500)
  if (!s) return null
  try {
    const url = new URL(s)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
    return s
  } catch {
    return false
  }
}
