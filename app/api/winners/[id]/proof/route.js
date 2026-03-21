/**
 * @fileoverview Proof-of-win upload endpoint.
 *
 * POST /api/winners/[id]/proof
 *   — Authenticated. Only the winner themselves may upload.
 *   — Accepts multipart/form-data with a single "file" field.
 *   — Validates: JPEG / PNG / WebP only, max 5 MB.
 *   — Magic-byte check prevents MIME spoofing attacks.
 *   — Uploads to Supabase Storage bucket "winner-proofs".
 *   — File path: winners/{winnerId}/{timestamp}.{ext}
 *   — Updates winners.proof_url with the public URL.
 *   — Returns the updated winner record.
 */

import { NextResponse }               from 'next/server'
import { cookies }                    from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { supabaseAdmin }              from '@/lib/supabase-admin'
import { validateUUID, validateImageMagicBytes } from '@/lib/validation'

/** Accepted browser-reported MIME types → file extension mapping */
const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
}

/** Maximum file size: 5 MB */
const MAX_FILE_BYTES = 5 * 1024 * 1024

/** Supabase Storage bucket name */
const BUCKET = 'winner-proofs'

/**
 * POST /api/winners/[id]/proof
 *
 * @param {import('next/server').NextRequest} request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<NextResponse>}
 */
export async function POST(request, { params }) {
  try {
    const { id: winnerId } = await params

    // ── Validate winner ID format ─────────────────────────────────────────────
    if (!winnerId || !validateUUID(winnerId)) {
      return NextResponse.json({ error: 'Invalid winner ID' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase    = createServerSupabaseClient(cookieStore)

    // ── Auth ──────────────────────────────────────────────────────────────────
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // ── Fetch winner and verify ownership ─────────────────────────────────────
    const { data: winner, error: winnerError } = await supabaseAdmin
      .from('winners')
      .select('id, user_id, payment_status, verified_at, proof_url')
      .eq('id', winnerId)
      .maybeSingle()

    if (winnerError) {
      console.error('POST /api/winners/[id]/proof winner fetch error:', winnerError)
      return NextResponse.json({ error: 'Failed to fetch winner record' }, { status: 500 })
    }

    if (!winner) {
      return NextResponse.json({ error: 'Winner record not found' }, { status: 404 })
    }

    if (winner.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (winner.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Prize has already been paid — proof upload is no longer required.' },
        { status: 409 }
      )
    }

    // ── Parse multipart form data ─────────────────────────────────────────────
    let formData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file           = formData.get('file')
    const replaceExisting = formData.get('replaceExisting')

    // ── Guard: existing proof requires explicit confirmation to replace ────────
    if (winner.proof_url && replaceExisting !== 'true') {
      return NextResponse.json(
        {
          error:          'You have already uploaded proof for this winner. To replace it, resubmit with replaceExisting=true.',
          hasExistingProof: true,
        },
        { status: 409 }
      )
    }

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided (field name: "file")' }, { status: 400 })
    }

    // ── Validate MIME type against allow-list ─────────────────────────────────
    const ext = ALLOWED_TYPES[file.type]
    if (!ext) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP images are accepted.' },
        { status: 400 }
      )
    }

    // ── Read buffer ───────────────────────────────────────────────────────────
    const buffer = await file.arrayBuffer()

    // ── Validate file size ────────────────────────────────────────────────────
    if (buffer.byteLength > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_BYTES / 1024 / 1024} MB.` },
        { status: 400 }
      )
    }

    if (buffer.byteLength < 12) {
      return NextResponse.json(
        { error: 'File is too small to be a valid image.' },
        { status: 400 }
      )
    }

    // ── Magic-byte validation (prevents MIME spoofing) ────────────────────────
    const magicResult = validateImageMagicBytes(buffer, file.type)
    if (!magicResult.valid) {
      return NextResponse.json({ error: magicResult.error }, { status: 400 })
    }

    // ── Build storage path ────────────────────────────────────────────────────
    const timestamp   = Date.now()
    const storagePath = `winners/${winnerId}/${timestamp}.${ext}`

    // ── Upload to Supabase Storage ────────────────────────────────────────────
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType:  file.type,
        upsert:       false,
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('POST /api/winners/[id]/proof upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload proof image' }, { status: 500 })
    }

    // ── Get public URL ────────────────────────────────────────────────────────
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    const proofUrl = urlData.publicUrl

    // ── Update winner record ──────────────────────────────────────────────────
    const { data: updatedWinner, error: updateError } = await supabaseAdmin
      .from('winners')
      .update({ proof_url: proofUrl })
      .eq('id', winnerId)
      .select(
        `id, user_id, match_type, prize_amount, payment_status,
         proof_url, verified_at, paid_at, created_at,
         draws ( id, month )`
      )
      .single()

    if (updateError) {
      console.error('POST /api/winners/[id]/proof update error:', updateError)
      return NextResponse.json({ error: 'Proof uploaded but failed to save URL' }, { status: 500 })
    }

    return NextResponse.json({ winner: updatedWinner })
  } catch (err) {
    console.error('POST /api/winners/[id]/proof error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
