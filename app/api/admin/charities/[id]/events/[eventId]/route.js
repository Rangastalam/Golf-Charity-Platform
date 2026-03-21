/**
 * @fileoverview Admin charity event delete.
 *
 * DELETE /api/admin/charities/[id]/events/[eventId]
 */

import { cookies }       from 'next/headers'
import { NextResponse }  from 'next/server'
import { requireAdmin }  from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function DELETE(req, { params }) {
  try {
    const cookieStore = await cookies()
    await requireAdmin(cookieStore)

    const { eventId } = await params

    const { error } = await supabaseAdmin
      .from('charity_events')
      .delete()
      .eq('id', eventId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const status = err?.status === 401 ? 401 : err?.status === 403 ? 403 : 500
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status })
  }
}
