/**
 * @fileoverview Table of recent draws for the admin overview page.
 *
 * @param {{ draws: Array<{id: string, draw_date: string, winner_count: number, prize_pool: number, status: string}> }} props
 */

import { formatCurrency } from '@/lib/prizePool'

/**
 * @param {{ draws: Object[] }} props
 */
export default function RecentDrawsTable({ draws }) {
  if (draws.length === 0) {
    return (
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 text-center text-gray-500 text-sm">
        No draws have been run yet.
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            {['Date', 'Prize pool', 'Winners', 'Status'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {draws.map((draw) => (
            <tr
              key={draw.id}
              className="border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 transition-colors"
            >
              <td className="px-4 py-3 text-gray-300">
                {new Date(draw.draw_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </td>
              <td className="px-4 py-3 font-semibold text-yellow-400">
                {formatCurrency(draw.prize_pool)}
              </td>
              <td className="px-4 py-3 text-gray-300">{draw.winner_count}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    draw.status === 'completed'
                      ? 'bg-green-900/60 text-green-400'
                      : draw.status === 'error'
                      ? 'bg-red-900/60 text-red-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {draw.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
