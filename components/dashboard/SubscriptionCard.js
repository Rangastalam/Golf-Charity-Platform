/**
 * @fileoverview Dashboard card showing the member's current subscription tier.
 *
 * @param {{ tier: Object|null, status: string, periodEnd: string|null }} props
 */

import Link from 'next/link'
import { ROUTES } from '@/constants'

/**
 * @param {{ tier: Object|null, status: string, periodEnd: string|null }} props
 */
export default function SubscriptionCard({ tier, status, periodEnd }) {
  const isActive = status === 'active'
  const isPastDue = status === 'past_due'

  const renewsOn = periodEnd
    ? new Date(periodEnd).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Membership
          </p>
          <h3 className="text-xl font-bold text-gray-900">
            {tier ? tier.name : 'No plan'}
          </h3>
        </div>

        {tier && (
          <span
            className={`text-xs font-semibold rounded-full px-2.5 py-1 ${
              isActive
                ? 'bg-green-100 text-green-800'
                : isPastDue
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isActive ? 'Active' : isPastDue ? 'Payment due' : status}
          </span>
        )}
      </div>

      {tier ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Draw entries</span>
            <span className="font-semibold text-gray-900">
              {tier.drawEntries} per month
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Monthly fee</span>
            <span className="font-semibold text-gray-900">
              ${tier.priceMonthly}/mo
            </span>
          </div>
          {renewsOn && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {status === 'active' ? 'Renews' : 'Expires'}
              </span>
              <span className="font-semibold text-gray-900">{renewsOn}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Subscribe to enter monthly prize draws and support charity.
        </p>
      )}

      <Link
        href={`${ROUTES.DASHBOARD}/subscription`}
        className="mt-auto text-sm font-medium text-green-700 hover:text-green-900 transition-colors"
      >
        {tier ? 'Manage subscription →' : 'Choose a plan →'}
      </Link>
    </div>
  )
}
