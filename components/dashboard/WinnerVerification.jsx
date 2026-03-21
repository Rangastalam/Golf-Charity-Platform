/**
 * @fileoverview Proof submission component for draw winners.
 *
 * Displayed when a user has a pending win with no proof uploaded yet.
 * Supports drag-and-drop or click-to-browse file selection.
 * Previews the selected image before submission.
 *
 * @param {{
 *   winner: {
 *     id: string,
 *     match_type: string,
 *     prize_amount: number,
 *     draws?: { month: string }
 *   },
 *   onProofSubmitted: (updatedWinner: object) => void
 * }} props
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatMatchType } from '@/lib/winnerHelpers'

/** Max file size in bytes (5 MB) */
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

/**
 * @param {{
 *   winner: object,
 *   onProofSubmitted: (w: object) => void
 * }} props
 */
export default function WinnerVerification({ winner, onProofSubmitted }) {
  const [file,       setFile]       = useState(null)
  const [preview,    setPreview]     = useState(null)
  const [dragging,   setDragging]   = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [error,      setError]      = useState('')
  const inputRef = useRef(null)

  // ── File selection / validation ───────────────────────────────────────────

  function validateAndSetFile(raw) {
    setError('')
    if (!raw) return

    if (!ALLOWED_TYPES.includes(raw.type)) {
      setError('Only JPEG, PNG, and WebP images are accepted.')
      return
    }
    if (raw.size > MAX_BYTES) {
      setError('File is too large. Maximum size is 5 MB.')
      return
    }

    setFile(raw)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(raw)
  }

  function handleInputChange(e) {
    validateAndSetFile(e.target.files?.[0] ?? null)
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    validateAndSetFile(e.dataTransfer.files?.[0] ?? null)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) {
      setError('Please select a file to upload.')
      return
    }

    setError('')
    setUploading(true)

    try {
      const form = new FormData()
      form.append('file', file)

      const res  = await fetch(`/api/winners/${winner.id}/proof`, {
        method: 'POST',
        body:   form,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Upload failed. Please try again.')
      } else {
        setSuccess(true)
        onProofSubmitted(data.winner)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function clearFile() {
    setFile(null)
    setPreview(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const drawMonth = winner.draws?.month
    ? new Date(winner.draws.month + '-01').toLocaleString('en-US', { month: 'long', year: 'numeric' })
    : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 px-6 py-5 text-white">
        <div className="flex items-start gap-3">
          <span className="text-3xl" aria-hidden="true">🏆</span>
          <div>
            <p className="text-xs font-semibold text-green-200 uppercase tracking-wider mb-0.5">
              You won{drawMonth ? ` — ${drawMonth}` : ''}
            </p>
            <p className="text-xl font-black">
              {formatMatchType(winner.match_type)}
            </p>
            <p className="text-green-100 text-sm mt-0.5">
              Prize amount:{' '}
              <span className="font-bold text-white">
                ₹{Number(winner.prize_amount).toLocaleString()}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="text-5xl mb-3">✅</div>
              <p className="font-bold text-gray-900 text-lg">Proof submitted!</p>
              <p className="text-gray-500 text-sm mt-2">
                Our team will review your submission and verify your win shortly.
                You&apos;ll be notified once your prize is confirmed.
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
            >
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
                <p className="text-xs font-semibold text-blue-900 mb-1">
                  What proof do you need to submit?
                </p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Take a screenshot of your scores page on GolfGives showing your 5
                  most recent Stableford scores. The scores must be visible and match
                  the drawn numbers for the{' '}
                  {drawMonth ?? 'relevant'} draw. Accepted formats: JPEG, PNG, WebP.
                  Maximum size: 5 MB.
                </p>
              </div>

              {/* Drop zone */}
              {!preview ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                  className={[
                    'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                    dragging
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-200 hover:border-green-300 hover:bg-gray-50',
                  ].join(' ')}
                >
                  <svg
                    className="w-10 h-10 text-gray-300 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    {dragging ? 'Drop your screenshot here' : 'Drag & drop or click to browse'}
                  </p>
                  <p className="text-xs text-gray-400">JPEG, PNG, WebP — max 5 MB</p>
                </div>
              ) : (
                /* Image preview */
                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Proof preview"
                    className="w-full max-h-64 object-contain bg-gray-50"
                  />
                  {/* File info bar */}
                  <div className="flex items-center justify-between px-3 py-2 bg-white border-t border-gray-100">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{file.name}</p>
                      <p className="text-xs text-gray-400">
                        {(file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="text-xs text-red-500 hover:text-red-700 ml-3 shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleInputChange}
                aria-label="Upload proof screenshot"
              />

              {/* Error */}
              {error && (
                <p className="text-xs text-red-600 mt-3" role="alert">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!file || uploading}
                className="mt-4 w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl py-3 text-sm transition-colors"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Uploading…
                  </span>
                ) : (
                  'Submit proof'
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
