/**
 * @fileoverview Admin winners management page — client component.
 *
 * Filter tabs: pending / verified / paid / all.
 * Actions: verify, reject, mark paid.
 * Bulk select for mark paid.
 * Proof modal: shows uploaded proof image.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/shared/Toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { value: 'pending',  label: 'Pending'  },
  { value: 'verified', label: 'Verified' },
  { value: 'paid',     label: 'Paid'     },
  { value: 'all',      label: 'All'      },
]

const STATUS_BADGE = {
  pending:  'bg-amber-100 text-amber-700',
  verified: 'bg-blue-100  text-blue-700',
  paid:     'bg-green-100 text-green-700',
}

function derivedStatus(w) {
  if (w.payment_status === 'paid') return 'paid'
  if (w.verified_at)               return 'verified'
  return 'pending'
}

// ─── Proof modal ──────────────────────────────────────────────────────────────

function ProofModal({ winner, onClose }) {
  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 md:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Proof of Bank Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none min-h-[44px] w-10 flex items-center justify-center">×</button>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">{winner.profiles?.full_name || winner.profiles?.email || '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {winner.match_type?.replace('_', ' ')} · ₹{Number(winner.prize_amount ?? 0).toLocaleString('en-IN')}
          </p>
        </div>
        {winner.proof_url ? (
          <Image src={winner.proof_url} alt="Proof" width={600} height={400} className="w-full rounded-xl object-contain max-h-80 border border-gray-100" unoptimized />
        ) : (
          <p className="text-sm text-gray-400 text-center py-8 bg-gray-50 rounded-xl">No proof uploaded yet.</p>
        )}
        {winner.bank_name && (
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1 text-sm">
            <p><span className="text-xs font-semibold text-gray-400 uppercase">Bank</span><br />{winner.bank_name}</p>
            {winner.account_number && <p><span className="text-xs font-semibold text-gray-400 uppercase">Account</span><br />{winner.account_number}</p>}
            {winner.ifsc_code      && <p><span className="text-xs font-semibold text-gray-400 uppercase">IFSC</span><br />{winner.ifsc_code}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminWinnersPage() {
  const toast = useToast()
  const [winners,   setWinners]   = useState([])
  const [filter,    setFilter]    = useState('pending')
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [acting,    setActing]    = useState(null)    // winner id being acted on
  const [selected,  setSelected]  = useState(new Set())
  const [bulkPaying, setBulkPaying] = useState(false)
  const [proofWinner, setProofWinner] = useState(null) // winner to show proof for

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelected(new Set())
    try {
      const params = new URLSearchParams({ filter })
      const res    = await fetch(`/api/admin/winners?${params}`)
      const json   = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load winners')
      setWinners(json.winners ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  async function doAction(id, action) {
    setActing(id)
    setError(null)
    try {
      const res  = await fetch(`/api/admin/winners/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Action failed')
      const SUCCESS_MESSAGES = {
        verify:    'Winner verified!',
        reject:    'Submission rejected.',
        mark_paid: 'Payment marked as sent!',
      }
      toast.success(SUCCESS_MESSAGES[action] ?? 'Done.')
      await load()
    } catch (e) {
      setError(e.message)
      toast.error(e.message)
    } finally {
      setActing(null)
    }
  }

  async function bulkMarkPaid() {
    if (selected.size === 0) return
    setBulkPaying(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/winners/bulk', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids: [...selected], action: 'mark_paid' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Bulk action failed')
      toast.success(`${selected.size} winner${selected.size > 1 ? 's' : ''} marked as paid.`)
      await load()
    } catch (e) {
      setError(e.message)
      toast.error(e.message)
    } finally {
      setBulkPaying(false)
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === winners.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(winners.map((w) => w.id)))
    }
  }

  const verifiedWinners = winners.filter((w) => derivedStatus(w) === 'verified')

  return (
    <div className="space-y-5 md:space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900">Winners</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">Verify and process prize payments.</p>
        </div>

        {/* Bulk pay */}
        {filter === 'verified' && selected.size > 0 && (
          <button
            onClick={bulkMarkPaid}
            disabled={bulkPaying}
            className="bg-green-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            {bulkPaying ? 'Processing…' : `Mark ${selected.size} Paid`}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={[
              'flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors min-h-[32px]',
              filter === tab.value ? 'bg-red-900 text-white border-red-900' : 'border-gray-200 text-gray-600 hover:border-gray-400',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Bulk select header for verified tab */}
      {!loading && filter === 'verified' && winners.length > 0 && (
        <div className="flex items-center gap-3 px-1">
          <input
            type="checkbox"
            checked={selected.size === winners.length && winners.length > 0}
            onChange={toggleAll}
            className="w-4 h-4 accent-red-800 cursor-pointer"
          />
          <span className="text-xs text-gray-500">Select all ({winners.length})</span>
        </div>
      )}

      {/* List */}
      {!loading && winners.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">No winners in this category.</p>
      )}

      {!loading && winners.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence>
            {winners.map((w) => {
              const status = derivedStatus(w)
              return (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white border border-gray-100 rounded-2xl px-4 md:px-5 py-4 flex items-start gap-3 flex-wrap sm:flex-nowrap"
                >
                  {/* Checkbox (verified filter only) */}
                  {filter === 'verified' && (
                    <input
                      type="checkbox"
                      checked={selected.has(w.id)}
                      onChange={() => toggleSelect(w.id)}
                      className="w-4 h-4 accent-red-800 cursor-pointer mt-1 flex-shrink-0"
                    />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <Link
                        href={`/admin/users/${w.user_id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-red-700 transition-colors truncate"
                      >
                        {w.profiles?.full_name || w.profiles?.email || '—'}
                      </Link>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {w.profiles?.email} · {w.match_type?.replace('_', ' ')} · ₹{Number(w.prize_amount ?? 0).toLocaleString('en-IN')}
                    </p>
                    {w.draw?.month && (
                      <p className="text-xs text-gray-400">Draw: {w.draw.month}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {/* Proof button */}
                    <button
                      onClick={() => setProofWinner(w)}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors border border-gray-200 rounded-lg px-3 py-2 min-h-[36px] hover:border-gray-400"
                    >
                      View Proof
                    </button>

                    {/* Status actions */}
                    {status === 'pending' && (
                      <>
                        <button
                          onClick={() => doAction(w.id, 'verify')}
                          disabled={acting === w.id}
                          className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg disabled:opacity-50 transition-colors min-h-[36px]"
                        >
                          {acting === w.id ? '…' : 'Verify'}
                        </button>
                        <button
                          onClick={() => doAction(w.id, 'reject')}
                          disabled={acting === w.id}
                          className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg disabled:opacity-50 transition-colors min-h-[36px]"
                        >
                          {acting === w.id ? '…' : 'Reject'}
                        </button>
                      </>
                    )}
                    {status === 'verified' && (
                      <button
                        onClick={() => doAction(w.id, 'mark_paid')}
                        disabled={acting === w.id}
                        className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg disabled:opacity-50 transition-colors min-h-[36px]"
                      >
                        {acting === w.id ? '…' : 'Mark Paid'}
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Proof modal */}
      <AnimatePresence>
        {proofWinner && (
          <ProofModal winner={proofWinner} onClose={() => setProofWinner(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
