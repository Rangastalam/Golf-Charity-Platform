/**
 * @fileoverview Admin quick actions panel — trigger draw, export data.
 *
 * @param {{ currentPrizePool: number, prizes: {first: number, second: number, third: number} }} props
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/prizePool'
import { API_ROUTES } from '@/constants'

/**
 * @param {{ currentPrizePool: number, prizes: Object }} props
 */
export default function QuickActions({ currentPrizePool, prizes }) {
  const router = useRouter()
  const [drawLoading, setDrawLoading] = useState(false)
  const [drawResult, setDrawResult] = useState(null)
  const [drawError, setDrawError] = useState(null)

  async function handleRunDraw() {
    const confirmed = window.confirm(
      `Run the monthly draw now?\n\nPrize pool: ${formatCurrency(currentPrizePool)}\n\nThis action cannot be undone.`
    )
    if (!confirmed) return

    setDrawLoading(true)
    setDrawError(null)
    setDrawResult(null)

    try {
      const res = await fetch(API_ROUTES.DRAWS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await res.json()

      if (!res.ok) {
        setDrawError(data.error ?? 'Failed to run draw')
        return
      }

      setDrawResult(data.draw)
      router.refresh()
    } catch (err) {
      console.error('Run draw error:', err)
      setDrawError('An unexpected error occurred')
    } finally {
      setDrawLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Run draw */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Monthly draw</h3>
        <p className="text-xs text-gray-400 mb-4">
          Prize pool: <span className="text-yellow-400 font-semibold">{formatCurrency(currentPrizePool)}</span>
          <br />
          1st: {formatCurrency(prizes.first)} · 2nd: {formatCurrency(prizes.second)} · 3rd: {formatCurrency(prizes.third)}
        </p>

        <button
          onClick={handleRunDraw}
          disabled={drawLoading}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {drawLoading && (
            <span className="h-4 w-4 border-2 border-yellow-900 border-t-transparent rounded-full animate-spin" />
          )}
          {drawLoading ? 'Running draw…' : '🎰 Run this month\'s draw'}
        </button>

        {drawError && (
          <p className="mt-2 text-xs text-red-400 bg-red-900/30 rounded-lg px-3 py-2">
            {drawError}
          </p>
        )}

        {drawResult && (
          <div className="mt-3 bg-green-900/30 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold text-green-400 mb-2">Draw complete!</p>
            {drawResult.winners.map((w) => (
              <div key={w.place} className="flex justify-between text-xs text-gray-300">
                <span>
                  {w.place === 1 ? '🥇' : w.place === 2 ? '🥈' : '🥉'} {w.displayName}
                </span>
                <span className="text-yellow-400 font-semibold">{w.prizeAmount}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation shortcuts */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 space-y-2">
        <h3 className="text-sm font-semibold text-white mb-3">Manage</h3>
        {[
          { href: '/admin/members', label: '👥 View all members' },
          { href: '/admin/charities', label: '💚 Manage charities' },
          { href: '/admin/scores', label: '⛳ Verify scores' },
          { href: '/admin/draws', label: '📋 Draw history' },
        ].map(({ href, label }) => (
          <a
            key={href}
            href={href}
            className="block text-sm text-gray-400 hover:text-white transition-colors py-1"
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}
