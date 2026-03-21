/**
 * @fileoverview Grid of stat tiles for the admin overview page.
 *
 * @param {{ stats: { totalMembers: number, activeSubscribers: number, monthlyRevenue: string, prizePool: string, charityDonation: string, activeCharities: number, tierCounts: { bronze: number, silver: number, gold: number } } }} props
 */

/**
 * @param {{ stats: Object }} props
 */
export default function AdminStatsGrid({ stats }) {
  const tiles = [
    {
      label: 'Total members',
      value: stats.totalMembers.toLocaleString(),
      sub: null,
      accent: 'text-white',
    },
    {
      label: 'Active subscribers',
      value: stats.activeSubscribers.toLocaleString(),
      sub: `${stats.tierCounts.bronze}B · ${stats.tierCounts.silver}S · ${stats.tierCounts.gold}G`,
      accent: 'text-green-400',
    },
    {
      label: 'Monthly revenue',
      value: stats.monthlyRevenue,
      sub: null,
      accent: 'text-yellow-400',
    },
    {
      label: 'Prize pool',
      value: stats.prizePool,
      sub: '40% of revenue',
      accent: 'text-yellow-400',
    },
    {
      label: 'Charity this month',
      value: stats.charityDonation,
      sub: '40% of revenue',
      accent: 'text-green-400',
    },
    {
      label: 'Active charities',
      value: stats.activeCharities.toLocaleString(),
      sub: null,
      accent: 'text-white',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {tiles.map(({ label, value, sub, accent }) => (
        <div
          key={label}
          className="bg-gray-800 rounded-2xl p-5 border border-gray-700"
        >
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className={`text-2xl font-black ${accent} mb-0.5`}>{value}</p>
          {sub && <p className="text-xs text-gray-500">{sub}</p>}
        </div>
      ))}
    </div>
  )
}
