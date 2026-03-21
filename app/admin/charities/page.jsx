/**
 * @fileoverview Admin charity management page — client component.
 *
 * Lists all charities with inline featured/active toggles.
 * Edit and delete actions. Link to create new.
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Row variants ──────────────────────────────────────────────────────────────

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCharitiesPage() {
  const [charities, setCharities] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [toggling,  setToggling]  = useState(null)   // charity id being toggled
  const [deleting,  setDeleting]  = useState(null)   // charity id being deleted
  const [confirmId, setConfirmId] = useState(null)   // id awaiting delete confirm

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/charities')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load charities')
      setCharities(json.charities ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function toggleField(id, field, current) {
    setToggling(id)
    try {
      const res  = await fetch(`/api/admin/charities/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ [field]: !current }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      setCharities((prev) => prev.map((c) => c.id === id ? { ...c, [field]: !current } : c))
    } catch (e) {
      setError(e.message)
    } finally {
      setToggling(null)
    }
  }

  async function deleteCharity(id) {
    setDeleting(id)
    setConfirmId(null)
    try {
      const res  = await fetch(`/api/admin/charities/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Delete failed')
      setCharities((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-5 md:space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900">Charities</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            {charities.length} registered
          </p>
        </div>
        <Link
          href="/admin/charities/new"
          className="bg-red-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-red-900 transition-colors min-h-[44px] flex items-center"
        >
          + Add Charity
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      )}

      {/* List */}
      {!loading && charities.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">No charities yet.</p>
      )}

      {!loading && charities.length > 0 && (
        <motion.div
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          <AnimatePresence>
            {charities.map((c) => (
              <motion.div
                key={c.id}
                variants={rowVariants}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white border border-gray-100 rounded-2xl px-4 md:px-5 py-4 flex items-center gap-3 md:gap-4 flex-wrap sm:flex-nowrap"
              >
                {/* Logo */}
                {c.logo_url ? (
                  <Image src={c.logo_url} alt={c.name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-400 text-lg">❤️</span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                  {c.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{c.description}</p>
                  )}
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Active toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer" title="Active">
                    <span className="text-xs text-gray-500">Active</span>
                    <button
                      onClick={() => toggleField(c.id, 'is_active', c.is_active)}
                      disabled={toggling === c.id}
                      className={[
                        'relative w-9 h-5 rounded-full transition-colors duration-200 disabled:opacity-50',
                        c.is_active ? 'bg-green-500' : 'bg-gray-200',
                      ].join(' ')}
                    >
                      <span className={[
                        'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                        c.is_active ? 'translate-x-4' : 'translate-x-0',
                      ].join(' ')} />
                    </button>
                  </label>

                  {/* Featured toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer" title="Featured">
                    <span className="text-xs text-gray-500">Featured</span>
                    <button
                      onClick={() => toggleField(c.id, 'is_featured', c.is_featured)}
                      disabled={toggling === c.id}
                      className={[
                        'relative w-9 h-5 rounded-full transition-colors duration-200 disabled:opacity-50',
                        c.is_featured ? 'bg-amber-400' : 'bg-gray-200',
                      ].join(' ')}
                    >
                      <span className={[
                        'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                        c.is_featured ? 'translate-x-4' : 'translate-x-0',
                      ].join(' ')} />
                    </button>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/admin/charities/${c.id}`}
                    className="text-xs font-semibold text-red-700 hover:text-red-900 transition-colors px-3 py-2 rounded-lg hover:bg-red-50 min-h-[36px] flex items-center"
                  >
                    Edit
                  </Link>

                  {confirmId === c.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => deleteCharity(c.id)}
                        disabled={deleting === c.id}
                        className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg disabled:opacity-50 min-h-[36px]"
                      >
                        {deleting === c.id ? '…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-2 min-h-[36px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(c.id)}
                      className="text-xs font-semibold text-gray-400 hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-red-50 min-h-[36px]"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
