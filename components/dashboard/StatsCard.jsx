/**
 * @fileoverview Reusable statistics card for the dashboard.
 *
 * @param {{
 *   title: string,
 *   value: string | number,
 *   subtitle?: string,
 *   icon?: React.ReactNode,
 *   trend?: 'up' | 'down' | 'neutral' | 'improving' | 'declining' | 'steady',
 *   trendLabel?: string,
 *   linkTo?: string,
 *   linkLabel?: string,
 *   loading?: boolean,
 *   accent?: string,
 *   className?: string
 * }} props
 */

'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'

/**
 * @param {{ trend?: string }} props
 */
function TrendBadge({ trend, label }) {
  const map = {
    up:        { icon: '↑', cls: 'text-green-600 bg-green-50' },
    improving: { icon: '↑', cls: 'text-green-600 bg-green-50' },
    down:      { icon: '↓', cls: 'text-red-500  bg-red-50'   },
    declining: { icon: '↓', cls: 'text-red-500  bg-red-50'   },
    neutral:   { icon: '→', cls: 'text-gray-500 bg-gray-100' },
    steady:    { icon: '→', cls: 'text-gray-500 bg-gray-100' },
  }
  const { icon, cls } = map[trend] ?? map.neutral

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>
      {icon} {label}
    </span>
  )
}

/**
 * @param {{ title: string, value: *, subtitle?: string, icon?: *, trend?: string, trendLabel?: string, linkTo?: string, linkLabel?: string, loading?: boolean, accent?: string, className?: string }} props
 */
export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  linkTo,
  linkLabel,
  loading = false,
  accent,
  className = '',
}) {
  if (loading) return <CardSkeleton />

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={`bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-3 ${className}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {title}
        </p>
        {icon && (
          <span
            className={[
              'w-9 h-9 rounded-xl flex items-center justify-center text-lg',
              accent ?? 'bg-green-50',
            ].join(' ')}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <div>
        <p className="text-3xl font-black text-gray-900 leading-none">
          {value ?? '—'}
        </p>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>

      {/* Footer */}
      {(trend || linkTo) && (
        <div className="flex items-center justify-between mt-auto pt-1">
          {trend ? (
            <TrendBadge trend={trend} label={trendLabel ?? trend} />
          ) : (
            <span />
          )}
          {linkTo && (
            <Link
              href={linkTo}
              className="text-xs font-semibold text-green-700 hover:text-green-900 transition-colors"
            >
              {linkLabel ?? 'View →'}
            </Link>
          )}
        </div>
      )}
    </motion.div>
  )
}
