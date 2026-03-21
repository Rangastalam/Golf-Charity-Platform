/**
 * @fileoverview Admin charity events API — create.
 *
 * POST /api/admin/charities/[id]/events
 */

import { cookies }       from 'next/headers'
import { NextResponse }  from 'next/server'
import { requireAdmin }  from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req, { params }) {
  try {
    const cookieStore = await cookies()
    await requireAdmin(cookieStore)

    const { id }  = await params
    const body    = await req.json()
    const { title, date, description } = body

    if (!title?.trim() || !date) {
      return NextResponse.json({ error: 'Title and date are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('charity_events')
      .insert({ charity_id: id, title: title.trim(), date, description: description ?? null })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ event: data }, { status: 201 })
  } catch (err) {
    const status = err?.status === 401 ? 401 : err?.status === 403 ? 403 : 500
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status })
  }
}
