/**
 * @fileoverview Admin charity CRUD by ID.
 *
 * GET    /api/admin/charities/[id]   — charity + events
 * PUT    /api/admin/charities/[id]   — update fields
 * DELETE /api/admin/charities/[id]   — delete charity
 */

import { cookies }       from 'next/headers'
import { NextResponse }  from 'next/server'
import { requireAdmin }  from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function checkAdmin() {
  const cookieStore = await cookies()
  await requireAdmin(cookieStore)
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req, { params }) {
  try {
    await checkAdmin()
    const { id } = await params

    const [charityRes, eventsRes] = await Promise.all([
      supabaseAdmin
        .from('charities')
        .select('id, name, description, logo_url, website_url, registration_number, is_active, is_featured, created_at')
        .eq('id', id)
        .single(),

      supabaseAdmin
        .from('charity_events')
        .select('id, title, date, description, created_at')
        .eq('charity_id', id)
        .order('date', { ascending: true }),
    ])

    if (charityRes.error) {
      if (charityRes.error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Charity not found' }, { status: 404 })
      }
      throw charityRes.error
    }

    return NextResponse.json({ charity: charityRes.data, events: eventsRes.data ?? [] })
  } catch (err) {
    const status = err?.status === 401 ? 401 : err?.status === 403 ? 403 : 500
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status })
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────

export async function PUT(req, { params }) {
  try {
    await checkAdmin()
    const { id }  = await params
    const body    = await req.json()

    const allowed = ['name', 'description', 'logo_url', 'website_url', 'registration_number', 'is_active', 'is_featured']
    const updates = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('charities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ charity: data })
  } catch (err) {
    const status = err?.status === 401 ? 401 : err?.status === 403 ? 403 : 500
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status })
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(req, { params }) {
  try {
    await checkAdmin()
    const { id } = await params

    // Remove events first
    await supabaseAdmin.from('charity_events').delete().eq('charity_id', id)

    const { error } = await supabaseAdmin.from('charities').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const status = err?.status === 401 ? 401 : err?.status === 403 ? 403 : 500
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status })
  }
}
