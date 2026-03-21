/**
 * @fileoverview Charity event endpoints.
 *
 * POST   /api/charities/[id]/events  — admin: create an event for a charity
 *                                      Body: { title, description?, event_date }
 *
 * DELETE /api/charities/[id]/events  — admin: hard delete an event
 *                                      Body: { id: eventId }
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { USER_ROLES } from '@/constants'

// ─── POST ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/charities/[id]/events
 * Admin only.
 *
 * @param {import('next/server').NextRequest} request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<NextResponse>}
 */
export async function POST(request, { params }) {
  try {
    const { id: charityId } = await params

    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)

    // ── Auth + admin check ────────────────────────────────────────────────────
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

    // ── Parse body ────────────────────────────────────────────────────────────
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { title, description, event_date } = body

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    // ── Validate event_date is in the future ──────────────────────────────────
    if (!event_date || typeof event_date !== 'string') {
      return NextResponse.json({ error: 'event_date is required (YYYY-MM-DD)' }, { status: 400 })
    }

    const parsedDate = new Date(event_date)
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'event_date is not a valid date' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (parsedDate <= today) {
      return NextResponse.json(
        { error: 'event_date must be in the future' },
        { status: 400 }
      )
    }

    // ── Verify charity exists and is active ───────────────────────────────────
    const { data: charity, error: charityError } = await supabaseAdmin
      .from('charities')
      .select('id')
      .eq('id', charityId)
      .eq('is_active', true)
      .maybeSingle()

    if (charityError) {
      console.error('POST /api/charities/[id]/events charity check error:', charityError)
      return NextResponse.json({ error: 'Failed to verify charity' }, { status: 500 })
    }

    if (!charity) {
      return NextResponse.json({ error: 'Charity not found' }, { status: 404 })
    }

    // ── Insert event ──────────────────────────────────────────────────────────
    const { data: event, error: insertError } = await supabaseAdmin
      .from('charity_events')
      .insert({
        charity_id:  charityId,
        title:       title.trim(),
        description: description ?? null,
        event_date:  String(event_date).slice(0, 10),
      })
      .select()
      .single()

    if (insertError) {
      console.error('POST /api/charities/[id]/events insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    return NextResponse.json({ event }, { status: 201 })
  } catch (err) {
    console.error('POST /api/charities/[id]/events error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * DELETE /api/charities/[id]/events
 * Admin only. Hard deletes an event by id.
 * Body: { id: string }
 *
 * @param {import('next/server').NextRequest} request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<NextResponse>}
 */
export async function DELETE(request, { params }) {
  try {
    const { id: charityId } = await params

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

    const { id: eventId } = body

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'id (event id) is required' }, { status: 400 })
    }

    // Verify the event belongs to this charity
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('charity_events')
      .select('id')
      .eq('id', eventId)
      .eq('charity_id', charityId)
      .maybeSingle()

    if (fetchError) {
      console.error('DELETE /api/charities/[id]/events fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to verify event' }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('charity_events')
      .delete()
      .eq('id', eventId)

    if (deleteError) {
      console.error('DELETE /api/charities/[id]/events delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/charities/[id]/events error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
