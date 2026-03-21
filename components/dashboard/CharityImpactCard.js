/**
 * @fileoverview Dashboard card showing charity impact for the current month.
 *
 * @param {{ charityAmount: number, formatted: string, subscriberCount: number }} props
 */

import Link from 'next/link'
import { ROUTES } from '@/constants'

/**
 * @param {{ charityAmount: number, formatted: string, subscriberCount: number }} props
 */
export default function CharityImpactCard({ formatted, subscriberCount }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Charity impact this month
        </p>
        <p className="text-3xl font-black text-green-700">{formatted}</p>
        <p className="text-sm text-gray-500 mt-1">
          contributed by {subscriberCount.toLocaleString()}{' '}
          {subscriberCount === 1 ? 'member' : 'members'}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-green-50 rounded-xl p-6 mb-4">
        <div className="text-center">
          <div className="text-4xl mb-2">⛳</div>
          <p className="text-sm text-green-800 font-medium">
            Every round played, every subscription paid —<br />
            your golf funds real change.
          </p>
        </div>
      </div>

      <Link
        href={ROUTES.CHARITIES}
        className="text-sm font-medium text-green-700 hover:text-green-900 transition-colors"
      >
        See where it goes →
      </Link>
    </div>
  )
}
