/**
 * @fileoverview Charity selection component for the member dashboard.
 *
 * Shows the member's currently selected charity.
 * "Change Charity" opens an animated modal with:
 *  - Searchable charity list
 *  - Contribution percentage slider (10–100%, step 5%) — full width on mobile
 *  - Calculated monthly amount based on their subscription plan
 *  - Save + success confirmation
 *
 * Modal behaviour:
 *  - Mobile: slides up from bottom (sheet), full width
 *  - Desktop (sm+): centred popup, max-w-lg
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import CharityCard from '@/components/shared/CharityCard'
import { PLANS } from '@/constants'
import { useToast } from '@/components/shared/Toast'

// ─── Main component ───────────────────────────────────────────────────────────

export default function CharitySelector() {
  const [selection,   setSelection]   = useState(null)   // { charities: {...}, contribution_percentage }
  const [charities,   setCharities]   = useState([])
  const [subPlan,     setSubPlan]     = useState(null)    // 'monthly' | 'yearly' | null
  const [loading,     setLoading]     = useState(true)
  const [modalOpen,   setModalOpen]   = useState(false)

  // Load selection + charities on mount
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [selRes, charRes, subRes] = await Promise.all([
          fetch('/api/user/charity'),
          fetch('/api/charities'),
          fetch('/api/subscriptions/status'),
        ])
        const [selData, charData, subData] = await Promise.all([
          selRes.json(),
          charRes.json(),
          subRes.json(),
        ])
        setSelection(selData.selection ?? null)
        setCharities(charData.charities ?? [])
        setSubPlan(subData.plan ?? null)
      } catch (err) {
        console.error('CharitySelector load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Prevent body scroll when modal is open on mobile
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [modalOpen])

  function handleSaved(newSelection) {
    setSelection(newSelection)
    setModalOpen(false)
  }

  if (loading) return <SelectorSkeleton />

  const currentCharity = selection?.charities ?? null
  const currentPct     = selection?.contribution_percentage ?? 10

  return (
    <>
      {/* ── Current selection card ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Your charity
        </p>

        {currentCharity ? (
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden bg-green-50 flex-shrink-0">
              {currentCharity.image_url ? (
                <Image
                  src={currentCharity.image_url}
                  alt={currentCharity.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-xl md:text-2xl">
                  🤝
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {currentCharity.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {currentPct}% of your subscription
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No charity selected yet.</p>
        )}

        <button
          onClick={() => setModalOpen(true)}
          className="mt-4 w-full text-center text-sm font-semibold text-green-700 hover:text-green-900 border border-green-200 hover:border-green-400 rounded-xl py-2.5 min-h-[44px] transition-colors"
        >
          {currentCharity ? 'Change charity' : 'Choose a charity'}
        </button>
      </div>

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <CharitySelectorModal
            charities={charities}
            currentCharityId={currentCharity?.id ?? null}
            currentPct={currentPct}
            subPlan={subPlan}
            onSaved={handleSaved}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   charities: object[],
 *   currentCharityId: string|null,
 *   currentPct: number,
 *   subPlan: string|null,
 *   onSaved: (selection: object) => void,
 *   onClose: () => void
 * }} props
 */
function CharitySelectorModal({
  charities,
  currentCharityId,
  currentPct,
  subPlan,
  onSaved,
  onClose,
}) {
  const toast        = useToast()
  const [query,      setQuery]      = useState('')
  const [selectedId, setSelectedId] = useState(currentCharityId)
  const [pct,        setPct]        = useState(currentPct)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return charities
    return charities.filter((c) => c.name.toLowerCase().includes(q))
  }, [charities, query])

  // Monthly contribution amount
  const monthlyAmount = useMemo(() => {
    if (!subPlan) return null
    const plan = PLANS[subPlan]
    if (!plan) return null
    const monthlyPricePaise =
      plan.billingInterval === 'year'
        ? plan.priceCents / 12
        : plan.priceCents
    return Math.round((monthlyPricePaise * pct) / 100)
  }, [subPlan, pct])

  async function handleSave() {
    if (!selectedId) {
      setError('Please select a charity.')
      return
    }
    setError('')
    setSaving(true)

    try {
      const res  = await fetch('/api/user/charity', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ charityId: selectedId, contributionPercentage: pct }),
      })
      const data = await res.json()

      if (!res.ok) {
        const message = data.error ?? 'Failed to save. Please try again.'
        setError(message)
        toast.error(message)
      } else {
        setSaved(true)
        toast.success('Charity updated!')
        setTimeout(() => onSaved(data.selection), 1200)
      }
    } catch {
      const message = 'Something went wrong. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40"
        aria-hidden="true"
      />

      {/* Panel — bottom sheet on mobile, centred popup on sm+ */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1     }}
        exit={{   opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        role="dialog"
        aria-modal="true"
        aria-label="Choose a charity"
        className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg z-50 bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm md:text-base font-bold text-gray-900">Choose your charity</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 md:px-6 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search charities…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]"
            />
          </div>
        </div>

        {/* Charity list — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No charities found.</p>
          ) : (
            filtered.map((c) => (
              <CharityCard
                key={c.id}
                charity={c}
                compact
                selected={selectedId === c.id}
                onClick={() => setSelectedId(c.id)}
              />
            ))
          )}
        </div>

        {/* Contribution slider + save — full width on all screen sizes */}
        <div className="flex-shrink-0 border-t border-gray-100 px-4 md:px-6 py-4 bg-gray-50 rounded-b-3xl space-y-4">
          {/* Slider */}
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <label
                htmlFor="contribution-pct"
                className="text-xs md:text-sm font-semibold text-gray-700"
              >
                Contribution percentage
              </label>
              <span className="text-green-700 font-bold text-sm">{pct}%</span>
            </div>
            {/* Slider is always full width */}
            <input
              id="contribution-pct"
              type="range"
              min={10}
              max={100}
              step={5}
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              className="w-full accent-green-600 h-2"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>10%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Monthly amount preview */}
          {monthlyAmount !== null && (
            <p className="text-xs text-gray-500 text-center">
              ≈{' '}
              <span className="font-semibold text-green-700">
                ₹{monthlyAmount.toLocaleString()}
              </span>{' '}
              per month to your chosen charity
            </p>
          )}

          {error && (
            <p className="text-xs text-red-600 text-center" role="alert">{error}</p>
          )}

          {/* Save button — always full width */}
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-2"
              >
                <p className="text-sm font-semibold text-green-700">✓ Saved!</p>
              </motion.div>
            ) : (
              <motion.button
                key="save"
                onClick={handleSave}
                disabled={saving || !selectedId}
                className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl py-3 text-sm transition-colors min-h-[44px]"
              >
                {saving ? 'Saving…' : 'Save selection'}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SelectorSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-5 animate-pulse">
      <div className="h-3 w-24 bg-gray-200 rounded mb-4" />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-32 bg-gray-200 rounded" />
          <div className="h-2.5 w-24 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="h-10 w-full bg-gray-100 rounded-xl mt-4" />
    </div>
  )
}
