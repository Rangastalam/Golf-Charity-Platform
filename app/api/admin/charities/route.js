/**
 * @fileoverview Admin charities API — list and create.
 *
 * GET  /api/admin/charities          — all charities
 * POST /api/admin/charities          — create charity
 */

import { cookies }      from 'next/headers'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function checkAdmin() {
  const cookieStore = await cookies()
  await requireAdmin(cookieStore)
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    await checkAdmin()

    const { data, error } = await supabaseAdmin
      .from('charities')
      .select('id, name, description, logo_url, website_url, registration_number, is_active, is_featured, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ charities: data ?? [] })
  } catch (err) {
    const status = err?.status === 401 ? 401 : err?.status === 403 ? 403 : 500
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req) {
  try {
    await checkAdmin()

    const body = await req.json()
    const { name, description, logo_url, website_url, registration_number, is_active, is_featured } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('charities')
      .insert({
        name:                name.trim(),
        description:         description         ?? null,
        logo_url:            logo_url            ?? null,
        website_url:         website_url         ?? null,
        registration_number: registration_number ?? null,
        is_active:           is_active  ?? true,
        is_featured:         is_featured ?? false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ charity: data }, { status: 201 })
  } catch (err) {
    const status = err?.status === 401 ? 401 : err?.status === 403 ? 403 : 500
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status })
  }
}
