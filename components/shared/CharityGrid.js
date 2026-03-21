/**
 * @fileoverview Grid of charity cards for the public charities page.
 *
 * @param {{ charities: Array<{id: string, name: string, description: string, logo_url: string|null, website_url: string|null, total_raised: number, category: string}> }} props
 */

import { formatCurrency } from '@/lib/prizePool'

/**
 * @param {{ charities: Object[] }} props
 */
export default function CharityGrid({ charities }) {
  return (
    <div>
      <p className="text-gray-500 mb-8">
        {charities.length} partner {charities.length === 1 ? 'charity' : 'charities'} supported
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {charities.map((charity) => (
          <CharityCard key={charity.id} charity={charity} />
        ))}
      </div>
    </div>
  )
}

/**
 * Individual charity card.
 *
 * @param {{ charity: Object }} props
 */
function CharityCard({ charity }) {
  return (
    <div className="border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow flex flex-col">
      <div className="flex items-start gap-4 mb-4">
        {charity.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={charity.logo_url}
            alt={`${charity.name} logo`}
            className="h-14 w-14 rounded-xl object-contain bg-gray-50 p-1 border border-gray-100 shrink-0"
          />
        ) : (
          <div className="h-14 w-14 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <span className="text-green-700 font-bold text-xl">
              {charity.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{charity.name}</h3>
          <span className="inline-block text-xs font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5 mt-1">
            {charity.category}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-4">
        {charity.description}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-400">Total raised</p>
          <p className="text-base font-bold text-green-700">
            {formatCurrency(charity.total_raised)}
          </p>
        </div>
        {charity.website_url && (
          <a
            href={charity.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-green-700 hover:text-green-900 underline underline-offset-2"
          >
            Visit website ↗
          </a>
        )}
      </div>
    </div>
  )
}
