/**
 * @fileoverview Prize tier display card.
 *
 * @param {{
 *   matchType: string,
 *   poolAmount: number,
 *   winnerCount?: number,
 *   isJackpot?: boolean,
 *   carryoverAmount?: number,
 *   index?: number
 * }} props
 */

'use client'

import { motion } from 'framer-motion'

const MATCH_LABELS = {
  five_match:  { label: '5 Number Match', short: 'Jackpot', icon: '🏆' },
  four_match:  { label: '4 Number Match', short: 'Runner Up', icon: '🥈' },
  three_match: { label: '3 Number Match', short: 'Bronze',   icon: '🥉' },
}

export default function PrizePoolCard({
  matchType,
  poolAmount,
  winnerCount = 1,
  isJackpot = false,
  carryoverAmount = 0,
  index = 0,
}) {
  const meta = MATCH_LABELS[matchType] ?? { label: matchType, short: '', icon: '🎯' }
  const hasCarryover = carryoverAmount > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.12, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
      className={[
        'relative rounded-2xl p-5 md:p-6 border flex flex-col gap-3 overflow-hidden',
        isJackpot
          ? 'bg-gradient-to-br from-amber-950/80 to-gray-900 border-amber-500/50 shadow-amber-900/30 shadow-lg'
          : 'bg-gray-900/80 border-gray-700/60',
      ].join(' ')}
    >
      {/* Jackpot glow */}
      {isJackpot && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/5 to-transparent pointer-events-none" />
      )}

      {/* Carryover badge */}
      {hasCarryover && (
        <span className="absolute top-4 right-4 bg-amber-400 text-amber-950 text-xs font-black px-2.5 py-1 rounded-full tracking-wide">
          ROLLOVER
        </span>
      )}

      {/* Icon + label */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{meta.icon}</span>
        <div>
          <p className={`text-xs font-bold uppercase tracking-widest ${isJackpot ? 'text-amber-400' : 'text-gray-400'}`}>
            {meta.short || meta.label}
          </p>
          <p className="text-sm font-semibold text-white">{meta.label}</p>
        </div>
      </div>

      {/* Prize amount */}
      <div>
        <p className={`text-3xl md:text-4xl font-black leading-none ${isJackpot ? 'text-amber-300' : 'text-white'}`}>
          ₹{Number(poolAmount).toLocaleString('en-IN')}
        </p>
        {hasCarryover && (
          <p className="text-xs text-amber-400/80 mt-1">
            incl. ₹{Number(carryoverAmount).toLocaleString('en-IN')} rollover
          </p>
        )}
      </div>

      {/* Winner count */}
      <p className="text-xs text-gray-500">
        {winnerCount === 1 ? '1 winner' : `Up to ${winnerCount} winners`}
      </p>

      {/* Bottom accent line for jackpot */}
      {isJackpot && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-amber-400 to-amber-500/0" />
      )}
    </motion.div>
  )
}
