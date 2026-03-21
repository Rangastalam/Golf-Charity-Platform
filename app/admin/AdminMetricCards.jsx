/**
 * @fileoverview Admin metric cards with Framer Motion stagger — client component.
 *
 * @param {{
 *   metrics: {
 *     activeSubscribers: number,
 *     monthlyPrizePool: number,
 *     monthlyCharityTotal: number,
 *     pendingVerifications: number
 *   }
 * }} props
 */

'use client'

import { motion } from 'framer-motion'

const container = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08 } },
}
const card = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
}

const CARDS = [
  {
    key:    'activeSubscribers',
    title:  'Active Subscribers',
    icon:   '👥',
    accent: 'bg-blue-50',
    fmt:    (v) => v.toLocaleString(),
  },
  {
    key:    'monthlyPrizePool',
    title:  'Prize Pool This Month',
    icon:   '🏆',
    accent: 'bg-purple-50',
    fmt:    (v) => `₹${v.toLocaleString('en-IN')}`,
  },
  {
    key:    'monthlyCharityTotal',
    title:  'Charity Contributions',
    icon:   '❤️',
    accent: 'bg-pink-50',
    fmt:    (v) => `₹${v.toLocaleString('en-IN')}`,
  },
  {
    key:    'pendingVerifications',
    title:  'Pending Verifications',
    icon:   '⏳',
    accent: 'bg-amber-50',
    fmt:    (v) => v.toLocaleString(),
    alert:  (v) => v > 0,
  },
]

export default function AdminMetricCards({ metrics }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
    >
      {CARDS.map(({ key, title, icon, accent, fmt, alert }) => {
        const value    = metrics[key] ?? 0
        const isAlert  = alert?.(value)

        return (
          <motion.div
            key={key}
            variants={card}
            className={[
              'bg-white rounded-2xl border p-4 md:p-5 flex flex-col gap-3',
              isAlert ? 'border-amber-300' : 'border-gray-100',
            ].join(' ')}
          >
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider leading-tight">
                {title}
              </p>
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${accent}`}>
                {icon}
              </span>
            </div>
            <p className={`text-2xl md:text-3xl font-black leading-none ${isAlert ? 'text-amber-600' : 'text-gray-900'}`}>
              {fmt(value)}
            </p>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
