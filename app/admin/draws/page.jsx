/**
 * @fileoverview Admin draw management page — client component.
 *
 * Current month: configure, simulate, publish, reset.
 * Past draws list with click-through to detail page.
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

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

// ─── Current month draw ───────────────────────────────────────────────────────

function CurrentDrawPanel({ draw, month, onRefresh }) {
  const [mode,    setMode]    = useState(draw?.draw_mode ?? 'random')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function callAction(action, extra = {}) {
    setLoading(true)
    setError(null)
    try {
      const url = draw ? `/api/draws/${draw.id}` : '/api/draws'
      const method = draw ? 'PUT' : 'POST'
      const body = draw
        ? JSON.stringify({ action, ...extra })
        : JSON.stringify({ month, draw_mode: mode })

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Request failed')
      onRefresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // No draw yet
  if (!draw) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">No draw configured for this month yet.</p>
        <div className="flex flex-wrap gap-2">
          {['random', 'algorithmic'].map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={[
                'text-sm font-semibold px-4 py-2 rounded-xl border transition-colors min-h-[44px] capitalize',
                mode === m ? 'bg-red-900 text-white border-red-900' : 'border-gray-200 text-gray-700 hover:border-gray-400',
              ].join(' ')}>
              {m}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button onClick={() => callAction('create')} disabled={loading}
          className="w-full sm:w-auto bg-red-800 text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-red-900 disabled:opacity-50 transition-colors min-h-[44px]">
          {loading ? 'Creating…' : 'Create Draw'}
        </button>
      </div>
    )
  }

  const { status, drawn_numbers, winners } = draw

  return (
    <div className="space-y-5">
      {/* Status + mode */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600'}`}>
          {status}
        </span>
        <span className="text-xs text-gray-400 capitalize">Mode: {draw.draw_mode}</span>
      </div>

      {/* Drawn numbers */}
      {drawn_numbers?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Drawn numbers</p>
          <div className="flex flex-wrap gap-2">
            {drawn_numbers.map((n) => (
              <span key={n}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-900 text-white font-black text-sm md:text-base flex items-center justify-center">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Winners preview */}
      {winners?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {status === 'published' ? 'Confirmed Winners' : 'Simulated Winners'}
          </p>
          <div className="space-y-2">
            {winners.map((w) => (
              <div key={w.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-sm font-semibold text-gray-800">
                  {w.profiles?.full_name || w.profiles?.email || '—'}
                </p>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-700 capitalize">{w.match_type?.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-500">₹{Number(w.prize_amount).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}

      {/* Action buttons per status */}
      {status === 'configured' && (
        <button onClick={() => callAction('simulate')} disabled={loading}
          className="w-full sm:w-auto bg-purple-700 text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-purple-800 disabled:opacity-50 transition-colors min-h-[44px]">
          {loading ? 'Running…' : '🎰 Run Simulation'}
        </button>
      )}

      {status === 'simulated' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => callAction('publish')} disabled={loading}
            className="flex-1 bg-green-700 text-white text-sm font-bold py-3 rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors min-h-[44px]">
            {loading ? 'Publishing…' : '✅ Publish Results'}
          </button>
          <button onClick={() => callAction('reset')} disabled={loading}
            className="flex-1 border border-gray-300 text-gray-700 text-sm font-bold py-3 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors min-h-[44px]">
            ↩ Reset & Reconfigure
          </button>
        </div>
      )}

      {status === 'published' && (
        <p className="text-xs text-gray-400 italic">Results are published and locked.</p>
      )}

      <Link href={`/admin/draws/${draw.id}`}
        className="inline-flex text-xs font-semibold text-red-700 hover:text-red-900 transition-colors">
        View full detail →
      </Link>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDrawsPage() {
  const month = currentMonthStr()
  const [currentDraw, setCurrentDraw] = useState(undefined) // undefined = loading
  const [pastDraws,   setPastDraws]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/draws')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')

      const draws = json.draws ?? []
      const cur   = draws.find((d) => d.month === month) ?? null
      const past  = draws.filter((d) => d.month !== month)

      setCurrentDraw(cur)
      setPastDraws(past)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6 md:space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-gray-900">Draw Management</h1>
        <p className="text-xs md:text-sm text-gray-500 mt-1">Configure and publish monthly prize draws.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Current month */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm md:text-base font-bold text-gray-900">{formatMonth(month)} Draw</h2>
          <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full">Current</span>
        </div>

        {loading
          ? <div className="animate-pulse space-y-3"><div className="h-8 bg-gray-100 rounded-xl" /><div className="h-10 w-40 bg-gray-100 rounded-xl" /></div>
          : <CurrentDrawPanel draw={currentDraw} month={month} onRefresh={load} />
        }
      </section>

      {/* Past draws */}
      {pastDraws.length > 0 && (
        <section>
          <h2 className="text-sm md:text-base font-bold text-gray-900 mb-4">Past Draws</h2>
          <div className="space-y-2">
            {pastDraws.map((d) => (
              <Link
                key={d.id}
                href={`/admin/draws/${d.id}`}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-4 md:px-5 py-4 hover:border-red-200 hover:shadow-sm transition-all gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{formatMonth(d.month)}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">
                    {d.draw_mode} mode · {d.winners?.length ?? 0} winner{d.winners?.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {d.status}
                  </span>
                  <span className="text-gray-300 text-sm">›</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
