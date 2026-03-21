/**
 * @fileoverview Admin draw detail page — client component.
 *
 * Shows drawn numbers, prize pool breakdown, winners list.
 * Supports simulate / publish / reset for non-published draws.
 */

'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonth(m) {
  const [year, month] = m.split('-')
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

const STATUS_BADGE = {
  configured: 'bg-blue-100 text-blue-700',
  simulated:  'bg-amber-100 text-amber-700',
  published:  'bg-green-100 text-green-700',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDrawDetailPage({ params }) {
  const { id } = use(params)

  const [draw,    setDraw]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting,  setActing]  = useState(false)
  const [error,   setError]   = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/draws/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load draw')
      setDraw(json.draw ?? json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function callAction(action) {
    setActing(true)
    setError(null)
    try {
      const res  = await fetch(`/api/draws/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Action failed')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setActing(false)
    }
  }

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl animate-pulse">
        <div className="h-8 w-48 bg-gray-100 rounded-xl" />
        <div className="h-40 bg-gray-100 rounded-2xl" />
        <div className="h-60 bg-gray-100 rounded-2xl" />
      </div>
    )
  }

  if (error && !draw) {
    return (
      <div className="max-w-3xl">
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        <Link href="/admin/draws" className="inline-block mt-4 text-sm font-semibold text-red-700 hover:text-red-900">
          ← Back to Draws
        </Link>
      </div>
    )
  }

  if (!draw) return null

  const { month, status, draw_mode, drawn_numbers, winners, prize_pools } = draw

  // Derive prize pool totals
  const totalPool   = (prize_pools ?? []).reduce((s, r) => s + Number(r.total_pool  ?? 0), 0)
  const totalPrize  = (winners    ?? []).reduce((s, w) => s + Number(w.prize_amount ?? 0), 0)
  const totalCharity = totalPool - totalPrize

  return (
    <div className="space-y-6 md:space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/admin/draws" className="text-xs font-semibold text-gray-400 hover:text-gray-600 mb-1 inline-block">
            ← Draws
          </Link>
          <h1 className="text-xl md:text-2xl font-black text-gray-900">
            {formatMonth(month)} Draw
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600'}`}>
              {status}
            </span>
            <span className="text-xs text-gray-400 capitalize">Mode: {draw_mode}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {status === 'configured' && (
            <button onClick={() => callAction('simulate')} disabled={acting}
              className="bg-purple-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-purple-800 disabled:opacity-50 transition-colors min-h-[44px]">
              {acting ? 'Running…' : '🎰 Run Simulation'}
            </button>
          )}
          {status === 'simulated' && (
            <>
              <button onClick={() => callAction('publish')} disabled={acting}
                className="bg-green-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors min-h-[44px]">
                {acting ? 'Publishing…' : '✅ Publish Results'}
              </button>
              <button onClick={() => callAction('reset')} disabled={acting}
                className="border border-gray-300 text-gray-700 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors min-h-[44px]">
                ↩ Reset
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Drawn numbers */}
      {drawn_numbers?.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Drawn Numbers</h2>
          <div className="flex flex-wrap gap-2">
            {drawn_numbers.map((n, i) => (
              <motion.span
                key={n}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-900 text-white font-black text-sm md:text-base flex items-center justify-center"
              >
                {n}
              </motion.span>
            ))}
          </div>
        </section>
      )}

      {/* Prize pool breakdown */}
      {totalPool > 0 && (
        <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Prize Pool Breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Total Pool',     value: totalPool,    color: 'bg-blue-50 text-blue-800' },
              { label: 'Prize Payouts',  value: totalPrize,   color: 'bg-purple-50 text-purple-800' },
              { label: 'Charity Share',  value: totalCharity, color: 'bg-pink-50 text-pink-800' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`${color} rounded-xl px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
                <p className="text-xl md:text-2xl font-black mt-1">₹{Number(value).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>

          {/* Per-pool table */}
          {prize_pools?.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Pool', 'Total', 'Prize %', 'Charity %'].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prize_pools.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-2 py-2.5 font-semibold text-gray-900 capitalize">{p.plan ?? `Pool ${i + 1}`}</td>
                      <td className="px-2 py-2.5 text-gray-700">₹{Number(p.total_pool).toLocaleString('en-IN')}</td>
                      <td className="px-2 py-2.5 text-gray-600">{p.prize_percentage ?? '—'}%</td>
                      <td className="px-2 py-2.5 text-gray-600">{p.charity_percentage ?? '—'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Winners */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4">
          {status === 'published' ? 'Confirmed Winners' : 'Simulated Winners'}
          {winners?.length > 0 && (
            <span className="ml-2 text-xs font-medium text-gray-400">({winners.length})</span>
          )}
        </h2>

        {!winners?.length ? (
          <p className="text-sm text-gray-400">
            {status === 'configured' ? 'Run a simulation to see potential winners.' : 'No winners found.'}
          </p>
        ) : (
          <div className="space-y-2">
            {winners.map((w) => (
              <div key={w.id}
                className="flex items-center justify-between bg-gray-50 rounded-xl px-3 md:px-4 py-3 gap-3 flex-wrap sm:flex-nowrap">
                <div className="min-w-0">
                  <Link href={`/admin/users/${w.user_id}`}
                    className="text-sm font-semibold text-gray-900 hover:text-red-700 transition-colors truncate block">
                    {w.profiles?.full_name || w.profiles?.email || '—'}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Ticket #{w.ticket_number ?? '—'} · {w.profiles?.email}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-gray-700 capitalize">
                    {w.match_type?.replace('_', ' ') ?? '—'}
                  </p>
                  <p className="text-sm font-black text-gray-900">₹{Number(w.prize_amount ?? 0).toLocaleString('en-IN')}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    w.payment_status === 'paid'    ? 'bg-green-100 text-green-700' :
                    w.verified_at                  ? 'bg-blue-100 text-blue-700'   :
                                                     'bg-amber-100 text-amber-700'
                  }`}>
                    {w.payment_status === 'paid' ? 'paid' : w.verified_at ? 'verified' : 'pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
