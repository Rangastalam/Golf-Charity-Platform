/**
 * @fileoverview Admin user management page — client component.
 *
 * Search, filter, paginate users. Mobile: card list. Desktop: table.
 * Framer Motion stagger on rows/cards.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link           from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: 'all',       label: 'All'       },
  { value: 'active',    label: 'Active'    },
  { value: 'lapsed',    label: 'Lapsed'    },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'inactive',  label: 'Inactive'  },
]

const STATUS_BADGE = {
  active:    'bg-green-100 text-green-700',
  lapsed:    'bg-red-100   text-red-700',
  cancelled: 'bg-gray-100  text-gray-600',
  inactive:  'bg-gray-100  text-gray-600',
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(users) {
  const headers = ['Name', 'Email', 'Status', 'Plan', 'Joined', 'Scores']
  const rows    = users.map((u) => [
    u.full_name ?? '',
    u.email,
    u.subscription_status ?? '',
    u.subscription_plan   ?? '',
    u.joined_at ? new Date(u.joined_at).toLocaleDateString('en-GB') : '',
    u.score_count ?? 0,
  ])
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `golfgives-users-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Row / Card ────────────────────────────────────────────────────────────────

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } },
}

function UserCard({ user }) {
  return (
    <motion.div variants={rowVariants}>
      <Link
        href={`/admin/users/${user.id}`}
        className="block bg-white border border-gray-100 rounded-2xl px-4 py-4 hover:border-red-200 hover:shadow-sm transition-all"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user.full_name || '(no name)'}
            </p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
          </div>
          {user.subscription_status && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[user.subscription_status] ?? 'bg-gray-100 text-gray-600'}`}>
              {user.subscription_status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-2">
          <p className="text-xs text-gray-500 capitalize">{user.subscription_plan ?? 'No plan'}</p>
          <p className="text-xs text-gray-400">{user.score_count} scores</p>
          <p className="text-xs text-gray-400 ml-auto">
            {user.joined_at
              ? new Date(user.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users,    setUsers]    = useState([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('all')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const LIMIT = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page:   String(page),
        limit:  String(LIMIT),
        search,
        status,
      })
      const res  = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => { load() }, [load])

  // Reset page when search/status changes
  useEffect(() => { setPage(1) }, [search, status])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div className="space-y-5 md:space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900">Users</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} member{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          onClick={() => exportCSV(users)}
          disabled={users.length === 0}
          className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:border-gray-400 transition-colors disabled:opacity-40 min-h-[44px]"
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Search + status filter */}
      <div className="space-y-3">
        <input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
        />
        {/* Status tabs — scroll horizontally on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={[
                'flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors min-h-[32px]',
                status === tab.value
                  ? 'bg-red-900 text-white border-red-900'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 md:h-12 bg-gray-100 rounded-xl" />
          ))}
        </div>
      )}

      {/* Mobile: card list */}
      {!loading && (
        <>
          <div className="md:hidden space-y-2">
            {users.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No users found.</p>
            ) : (
              <motion.div
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                initial="hidden"
                animate="show"
                className="space-y-2"
              >
                {users.map((u) => <UserCard key={u.id} user={u} />)}
              </motion.div>
            )}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Name', 'Email', 'Status', 'Plan', 'Joined', 'Scores', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <AnimatePresence mode="wait">
                <motion.tbody
                  key={`${page}-${search}-${status}`}
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
                  initial="hidden"
                  animate="show"
                >
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-gray-400 py-10 text-sm">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <motion.tr
                        key={u.id}
                        variants={rowVariants}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-gray-900 truncate max-w-[160px]">
                          {u.full_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 truncate max-w-[200px]">{u.email}</td>
                        <td className="px-4 py-3">
                          {u.subscription_status ? (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[u.subscription_status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {u.subscription_status}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 capitalize text-gray-600">{u.subscription_plan ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {u.joined_at
                            ? new Date(u.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{u.score_count}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="text-xs font-semibold text-red-700 hover:text-red-900 transition-colors"
                          >
                            View →
                          </Link>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </motion.tbody>
              </AnimatePresence>
            </table>
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-40 min-h-[44px] px-4 border border-gray-200 rounded-xl hover:border-gray-400 transition-colors"
          >
            ← Previous
          </button>
          <p className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </p>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-40 min-h-[44px] px-4 border border-gray-200 rounded-xl hover:border-gray-400 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
