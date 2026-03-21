/**
 * @fileoverview Client-side charity listing with real-time search.
 * Receives the full charities list from the server component and filters in-browser.
 */

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import CharityCard from '@/components/shared/CharityCard'

/**
 * @param {{ charities: Array<object> }} props
 */
export default function CharitiesClient({ charities }) {
  const router  = useRouter()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return charities
    return charities.filter((c) => c.name.toLowerCase().includes(q))
  }, [charities, query])

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  }

  return (
    <div>
      {/* Search bar */}
      <div className="max-w-md mx-auto mb-10">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            placeholder="Search charities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm text-sm"
          />
        </div>
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-20"
          >
            <p className="text-5xl mb-4" aria-hidden="true">🔍</p>
            <p className="text-lg font-semibold text-gray-700">No charities found</p>
            <p className="text-sm text-gray-500 mt-1">
              Try a different search term or{' '}
              <button
                onClick={() => setQuery('')}
                className="text-green-700 hover:underline font-medium"
              >
                clear the filter
              </button>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filtered.map((charity) => (
              <motion.div key={charity.id} variants={item}>
                <CharityCard
                  charity={charity}
                  onClick={() => router.push(`/charities/${charity.id}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
