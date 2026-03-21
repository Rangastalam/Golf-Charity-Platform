/**
 * @fileoverview Admin winners bulk action.
 *
 * PUT /api/admin/winners/bulk
 *   body: { ids: string[], action: 'mark_paid' }
 */

import { cookies }       from 'next/headers'
import { NextResponse }  from 'next/server'
import { requireAdmin }  from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PUT(req) {
  try {
    const cookieStore = await cookies()
    await requireAdmin(cookieStore)

    const { ids, action } = await req.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
    }
    if (action !== 'mark_paid') {
      return NextResponse.json({ error: 'Only mark_paid is supported for bulk actions' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('winners')
      .update({ payment_status: 'paid' })
      .in('id', ids)

    if (error) throw error

    return NextResponse.json({ success: true, updated: ids.length })
  } catch (err) {
    const status = err?.status === 401 ? 401 : err?.status === 403 ? 403 : 500
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status })
  }
}
