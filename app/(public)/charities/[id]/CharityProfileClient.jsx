/**
 * @fileoverview Donation form on the individual charity page.
 * Client component — handles independent donation submission.
 *
 * @param {{ charityId: string, charityName: string }} props
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * @param {{ charityId: string, charityName: string }} props
 */
export default function CharityProfileClient({ charityId, charityName }) {
  const [amount, setAmount]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  async function handleDonate(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid amount greater than 0.')
      return
    }

    setLoading(true)
    try {
      const res  = await fetch('/api/charities/donate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ charityId, amount: num }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Donation failed. Please try again.')
      } else {
        setSuccess(true)
        setAmount('')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const presets = [5, 10, 25, 50]

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <p className="text-sm font-bold text-gray-900 mb-1">One-off donation</p>
      <p className="text-xs text-gray-500 mb-4">
        Support {charityName} with a direct contribution.
      </p>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-4"
          >
            <p className="text-3xl mb-2">💚</p>
            <p className="text-sm font-semibold text-green-800">Thank you!</p>
            <p className="text-xs text-gray-500 mt-1">Your donation has been recorded.</p>
            <button
              onClick={() => setSuccess(false)}
              className="mt-3 text-xs text-green-700 hover:underline"
            >
              Donate again
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleDonate}
          >
            {/* Quick-amount presets */}
            <div className="flex gap-2 mb-3">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(String(p))}
                  className={[
                    'flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
                    String(p) === amount
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-gray-200 text-gray-600 hover:border-green-300',
                  ].join(' ')}
                >
                  ₹{p}
                </button>
              ))}
            </div>

            {/* Custom amount input */}
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                ₹
              </span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Other amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-600 mb-2" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !amount}
              className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
            >
              {loading ? 'Processing…' : 'Donate'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
