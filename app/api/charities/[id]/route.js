/**
 * @fileoverview Single charity endpoints.
 *
 * GET    /api/charities/[id]  — public: charity detail + all events ordered by date
 * PUT    /api/charities/[id]  — admin: update any charity fields
 * DELETE /api/charities/[id]  — admin: soft delete (sets is_active = false)
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { USER_ROLES } from '@/constants'

// ─── GET ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/charities/[id]
 *
 * @param {import('next/server').NextRequest} _request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<NextResponse>}
 */
export async function GET(_request, { params }) {
  try {
    const { id } = await params

    const { data: charity, error } = await supabaseAdmin
      .from('charities')
      .select(
        `id, name, description, image_url, website_url, is_featured, is_active, created_at,
         charity_events ( id, title, description, event_date, created_at )`
      )
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('GET /api/charities/[id] DB error:', error)
      return NextResponse.json({ error: 'Failed to fetch charity' }, { status: 500 })
    }

    if (!charity) {
      return NextResponse.json({ error: 'Charity not found' }, { status: 404 })
    }

    // Sort events by date ascending
    const sorted = {
      ...charity,
      charity_events: (charity.charity_events ?? []).sort((a, b) =>
        a.event_date.localeCompare(b.event_date)
      ),
    }

    return NextResponse.json({ charity: sorted })
  } catch (err) {
    console.error('GET /api/charities/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────

/**
 * PUT /api/charities/[id]
 * Admin only. Accepts any subset of charity fields.
 *
 * @param {import('next/server').NextRequest} request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<NextResponse>}
 */
export async function PUT(request, { params }) {
  try {
    const { id } = await params

    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)

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

    // Build update payload — only include fields present in the body
    const allowed = ['name', 'description', 'image_url', 'website_url', 'is_featured', 'is_active']
    const updates = {}
    for (const field of allowed) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Ensure name is not set to an empty string
    if ('name' in updates && (typeof updates.name !== 'string' || updates.name.trim() === '')) {
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    }
    if ('name' in updates) updates.name = updates.name.trim()

    const { data: charity, error: updateError } = await supabaseAdmin
      .from('charities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('PUT /api/charities/[id] update error:', updateError)
      return NextResponse.json({ error: 'Failed to update charity' }, { status: 500 })
    }

    return NextResponse.json({ charity })
  } catch (err) {
    console.error('PUT /api/charities/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * DELETE /api/charities/[id]
 * Admin only. Soft delete — sets is_active = false. Never hard deletes.
 *
 * @param {import('next/server').NextRequest} request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<NextResponse>}
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)

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

    // Verify the charity exists first
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('charities')
      .select('id, name')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('DELETE /api/charities/[id] fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to verify charity' }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: 'Charity not found' }, { status: 404 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('charities')
      .update({ is_active: false })
      .eq('id', id)

    if (updateError) {
      console.error('DELETE /api/charities/[id] update error:', updateError)
      return NextResponse.json({ error: 'Failed to deactivate charity' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Charity "${existing.name}" has been deactivated`,
    })
  } catch (err) {
    console.error('DELETE /api/charities/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
