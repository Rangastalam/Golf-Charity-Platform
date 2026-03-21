/**
 * @fileoverview Recent activity feed for the dashboard.
 *
 * Receives a pre-built activity array (constructed server-side from multiple
 * tables) and renders it with Framer Motion stagger animation.
 *
 * @param {{
 *   activities: Array<{
 *     id: string,
 *     type: 'score_added'|'draw_entered'|'draw_won'|'charity_changed'|'subscription_renewed',
 *     description: string,
 *     timestamp: string
 *   }>
 * }} props
 */

'use client'

import { motion } from 'framer-motion'

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICONS = {
  score_added: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l3 3" />
    </svg>
  ),
  draw_entered: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M12 6v12M2 12h20" />
    </svg>
  ),
  draw_won: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M6 9H4a2 2 0 000 4h2M18 9h2a2 2 0 010 4h-2" />
      <path d="M8 21h8M12 17v4M6 3h12v9a6 6 0 01-12 0V3z" />
    </svg>
  ),
  charity_changed: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  ),
  subscription_renewed: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  ),
}

const ICON_COLORS = {
  score_added:          'bg-blue-100   text-blue-600',
  draw_entered:         'bg-purple-100 text-purple-600',
  draw_won:             'bg-amber-100  text-amber-600',
  charity_changed:      'bg-pink-100   text-pink-600',
  subscription_renewed: 'bg-green-100  text-green-600',
}

// ─── Relative timestamp ────────────────────────────────────────────────────────

/**
 * @param {string} iso
 * @returns {string}
 */
function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)

  if (mins  <  1)  return 'just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  <  2)  return 'yesterday'
  if (days  <  7)  return `${days} days ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @param {{ activities: Array<object> }} props
 */
export default function ActivityFeed({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-3xl mb-2" aria-hidden="true">📋</p>
        <p className="text-sm font-medium text-gray-600">No activity yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Your scores, draw entries, and wins will appear here.
        </p>
      </div>
    )
  }

  const container = {
    hidden: {},
    show:   { transition: { staggerChildren: 0.06 } },
  }
  const item = {
    hidden: { opacity: 0, x: -10 },
    show:   { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } },
  }

  return (
    <motion.ul
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-3"
      role="list"
    >
      {activities.map((act) => (
        <motion.li
          key={act.id}
          variants={item}
          className="flex items-start gap-3"
        >
          {/* Icon */}
          <span
            className={[
              'flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5',
              ICON_COLORS[act.type] ?? 'bg-gray-100 text-gray-500',
            ].join(' ')}
            aria-hidden="true"
          >
            {ICONS[act.type]}
          </span>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-800 leading-snug">{act.description}</p>
            <p className="text-xs text-gray-400 mt-0.5">{relativeTime(act.timestamp)}</p>
          </div>
        </motion.li>
      ))}
    </motion.ul>
  )
}
