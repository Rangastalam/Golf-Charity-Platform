/**
 * @fileoverview Dashboard card showing this month's prize pool breakdown.
 *
 * @param {{ prizePool: number, prizes: {first: number, second: number, third: number}, formatted: {pool: string, first: string, second: string, third: string} }} props
 */

export default function PrizePoolCard({ formatted }) {
  const places = [
    { label: '1st place', amount: formatted.first, medal: '🥇' },
    { label: '2nd place', amount: formatted.second, medal: '🥈' },
    { label: '3rd place', amount: formatted.third, medal: '🥉' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
        This month&apos;s prize pool
      </p>
      <p className="text-3xl font-black text-gray-900 mb-4">{formatted.pool}</p>

      <div className="space-y-2">
        {places.map(({ label, amount, medal }) => (
          <div
            key={label}
            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
          >
            <span className="text-sm text-gray-500 flex items-center gap-1.5">
              <span>{medal}</span> {label}
            </span>
            <span className="text-sm font-bold text-gray-900">{amount}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
