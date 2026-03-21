/**
 * @fileoverview Reusable charity card component.
 *
 * Used on the public charities listing page and inside the CharitySelector modal.
 *
 * @param {{
 *   charity: {
 *     id: string,
 *     name: string,
 *     description?: string,
 *     image_url?: string,
 *     is_featured?: boolean,
 *     charity_events?: Array<{ id: string, event_date: string }>
 *   },
 *   onClick?: () => void,
 *   selected?: boolean,
 *   compact?: boolean
 * }} props
 */

'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

/**
 * @param {{
 *   charity: object,
 *   onClick?: () => void,
 *   selected?: boolean,
 *   compact?: boolean
 * }} props
 */
export default function CharityCard({ charity, onClick, selected = false, compact = false }) {
  const upcomingCount = (charity.charity_events ?? []).filter((e) => {
    const today = new Date().toISOString().slice(0, 10)
    return e.event_date >= today
  }).length

  const description = charity.description ?? ''
  const truncated =
    description.length > 120 ? description.slice(0, 117).trimEnd() + '…' : description

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.10)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={[
        'relative bg-white rounded-2xl border overflow-hidden flex flex-col transition-colors',
        onClick ? 'cursor-pointer' : '',
        selected
          ? 'border-green-500 ring-2 ring-green-300'
          : 'border-gray-200 hover:border-green-300',
        compact ? 'p-3' : 'p-0',
      ].join(' ')}
    >
      {/* Featured badge */}
      {charity.is_featured && (
        <span className="absolute top-3 right-3 z-10 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
          Featured
        </span>
      )}

      {/* Image */}
      {!compact && (
        <div className="relative w-full h-40 bg-green-50 flex-shrink-0">
          {charity.image_url ? (
            <Image
              src={charity.image_url}
              alt={charity.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl" aria-hidden="true">🤝</span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className={compact ? '' : 'p-5 flex flex-col flex-1'}>
        {/* Compact image placeholder */}
        {compact && charity.image_url && (
          <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 mb-2">
            <Image
              src={charity.image_url}
              alt={charity.name}
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
        )}

        <h3
          className={[
            'font-bold text-gray-900 leading-snug',
            compact ? 'text-sm' : 'text-base mb-2',
          ].join(' ')}
        >
          {charity.name}
        </h3>

        {!compact && truncated && (
          <p className="text-sm text-gray-500 flex-1 mb-3 leading-relaxed">{truncated}</p>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between mt-auto pt-1">
          {upcomingCount > 0 ? (
            <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">
              {upcomingCount} upcoming event{upcomingCount !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs text-gray-400">No upcoming events</span>
          )}

          {selected && (
            <span className="text-green-600" aria-label="Selected">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
