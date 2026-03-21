/**
 * @fileoverview Admin winner action by ID.
 *
 * PUT /api/admin/winners/[id]
 *   body: { action: 'verify' | 'reject' | 'mark_paid' }
 */

import { cookies }       from 'next/headers'
import { NextResponse }  from 'next/server'
import { requireAdmin }  from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PUT(req, { params }) {
  try {
    const cookieStore = await cookies()
    await requireAdmin(cookieStore)

    const { id }    = await params
    const { action } = await req.json()

    if (!['verify', 'reject', 'mark_paid'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // reject — delete the row (no rejected enum value exists in payment_status)
    if (action === 'reject') {
      const { error } = await supabaseAdmin
        .from('winners')
        .delete()
        .eq('id', id)

      if (error) throw error
      return NextResponse.json({ winner: null })
    }

    const updates = {}
    if (action === 'verify') {
      updates.verified_at    = new Date().toISOString()
      updates.payment_status = 'pending'
    } else if (action === 'mark_paid') {
      updates.payment_status = 'paid'
    }

    const { data, error } = await supabaseAdmin
      .from('winners')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ winner: data })
  } catch (err) {
    const status = err?.status === 401 ? 401 : err?.status === 403 ? 403 : 500
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status })
  }
}
