'use client'

/**
 * @fileoverview Score list with inline editing and deletion.
 *
 * Shows up to 5 scores in reverse chronological order.
 * Each row supports inline edit (score + date) and delete with inline confirm.
 * Displays score average and trend indicator at the bottom.
 *
 * Layout:
 *   - Mobile: each score rendered as a card (no table)
 *   - Desktop (md+): list rows with side-by-side score and controls
 *
 * @param {{
 *   scores: Array<{ id: string, score: number, played_at: string, created_at: string }>,
 *   onScoresChange: (scores: Array) => void
 * }} props
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  validateScore,
  validateScoreDate,
  formatScoreDate,
  todayInputValue,
  getScoreAverage,
  getScoreTrend,
} from '@/lib/scoreHelpers'

// ─── Trend icon ───────────────────────────────────────────────────────────────

/** @param {{ trend: string }} props */
function TrendBadge({ trend }) {
  const config = {
    improving: {
      label: 'Improving',
      icon: '↑',
      classes: 'text-green-400 bg-green-900/40 border-green-700',
    },
    declining: {
      label: 'Declining',
      icon: '↓',
      classes: 'text-red-400 bg-red-900/40 border-red-700',
    },
    steady: {
      label: 'Steady',
      icon: '→',
      classes: 'text-gray-400 bg-gray-800 border-gray-600',
    },
  }

  const { label, icon, classes } = config[trend] ?? config.steady

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold border rounded-full px-2.5 py-0.5 ${classes}`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  )
}

// ─── Single score row ─────────────────────────────────────────────────────────

/**
 * @param {{
 *   entry: { id: string, score: number, played_at: string },
 *   index: number,
 *   onSaved: (updated: Object) => void,
 *   onDeleted: (id: string) => void,
 * }} props
 */
function ScoreRow({ entry, index, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [editScore, setEditScore] = useState(String(entry.score))
  const [editDate, setEditDate] = useState(entry.played_at.slice(0, 10))
  const [editScoreError, setEditScoreError] = useState(null)
  const [editDateError, setEditDateError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // ── Edit handlers ──────────────────────────────────────────────────────────

  function openEdit() {
    setEditScore(String(entry.score))
    setEditDate(entry.played_at.slice(0, 10))
    setEditScoreError(null)
    setEditDateError(null)
    setSaveError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setSaveError(null)
  }

  async function submitEdit() {
    const sv = validateScore(editScore)
    const dv = validateScoreDate(editDate)
    setEditScoreError(sv.valid ? null : sv.error)
    setEditDateError(dv.valid ? null : dv.error)
    if (!sv.valid || !dv.valid) return

    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/scores/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: Number(editScore),
          played_at: editDate,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error ?? 'Failed to update')
        return
      }
      setEditing(false)
      onSaved(data.score)
    } catch {
      setSaveError('Network error. Try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete handlers ────────────────────────────────────────────────────────

  async function confirmAndDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/scores', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDeleteError(data.error ?? 'Failed to delete')
        return
      }
      onDeleted(data.scores)
    } catch {
      setDeleteError('Network error. Try again.')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="py-3 border-b border-gray-700 last:border-0"
    >
      {editing ? (
        /* ── Edit mode ────────────────────────────────────────────────────── */
        <div className="space-y-2">
          {/* On mobile: stack score + date vertically; on sm+: side by side */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Score</label>
              <input
                type="number"
                min={1}
                max={45}
                value={editScore}
                onChange={(e) => {
                  setEditScore(e.target.value)
                  setEditScoreError(null)
                }}
                className="w-full sm:w-20 h-11 rounded-lg bg-gray-700 border border-gray-600 text-white text-center text-sm px-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {editScoreError && (
                <p className="text-xs text-red-400 mt-0.5">{editScoreError}</p>
              )}
            </div>
            <div className="flex-1 sm:flex-none">
              <label className="block text-xs text-gray-400 mb-1">Date</label>
              <input
                type="date"
                value={editDate}
                max={todayInputValue()}
                onChange={(e) => {
                  setEditDate(e.target.value)
                  setEditDateError(null)
                }}
                className="w-full sm:w-auto h-11 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm px-2 focus:outline-none focus:ring-2 focus:ring-green-500 [color-scheme:dark]"
              />
              {editDateError && (
                <p className="text-xs text-red-400 mt-0.5">{editDateError}</p>
              )}
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={submitEdit}
                disabled={saving}
                className="flex-1 sm:flex-none h-11 px-4 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="flex-1 sm:flex-none h-11 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
          {saveError && (
            <p className="text-xs text-red-400">{saveError}</p>
          )}
        </div>
      ) : confirmDelete ? (
        /* ── Delete confirmation ──────────────────────────────────────────── */
        <div className="space-y-3">
          <p className="text-sm text-gray-300">
            Delete{' '}
            <span className="font-semibold text-white">{entry.score} pts</span>
            {' '}on{' '}
            <span className="font-semibold text-white">
              {formatScoreDate(entry.played_at)}
            </span>
            ?
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmAndDelete}
              disabled={deleting}
              className="flex-1 h-10 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="flex-1 h-10 px-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              Keep it
            </button>
          </div>
          {deleteError && (
            <p className="text-xs text-red-400">{deleteError}</p>
          )}
        </div>
      ) : (
        /* ── Normal view — card on mobile, row on sm+ ─────────────────────── */
        <div className="flex items-center justify-between gap-3">
          {/* Score + date */}
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <span className="text-xl md:text-2xl font-extrabold text-white tabular-nums w-9 md:w-10 text-right flex-shrink-0">
              {entry.score}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider">
                pts
              </p>
              <p className="text-xs md:text-sm text-gray-300 truncate">
                {formatScoreDate(entry.played_at)}
              </p>
            </div>
          </div>

          {/* Edit + delete — always visible, min touch target 44px */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={openEdit}
              aria-label="Edit score"
              className="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors text-sm"
            >
              ✎
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete score"
              className="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-red-900 text-gray-400 hover:text-red-400 transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </motion.li>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

/**
 * @param {{
 *   scores: Array<{ id: string, score: number, played_at: string, created_at: string }>,
 *   onScoresChange: (scores: Array) => void
 * }} props
 */
export default function ScoreList({ scores, onScoresChange }) {
  const average = getScoreAverage(scores)
  const trend = getScoreTrend(scores)

  /** Merges an updated single score into the list */
  function handleSaved(updatedScore) {
    const next = scores.map((s) =>
      s.id === updatedScore.id ? { ...s, ...updatedScore } : s
    )
    onScoresChange(next)
  }

  /** Replaces the list with the server-returned updated list after deletion */
  function handleDeleted(updatedScores) {
    onScoresChange(updatedScores)
  }

  if (scores.length === 0) {
    return (
      <div className="py-8 md:py-10 text-center">
        <p className="text-3xl mb-3" aria-hidden="true">⛳</p>
        <p className="text-gray-400 text-sm">No scores yet.</p>
        <p className="text-gray-500 text-xs mt-1">
          Submit your first round above to get started.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* ── Score rows ──────────────────────────────────────────────────── */}
      <ul className="divide-y-0">
        <AnimatePresence mode="popLayout" initial={false}>
          {scores.map((entry, i) => (
            <ScoreRow
              key={entry.id}
              entry={entry}
              index={i}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
            />
          ))}
        </AnimatePresence>
      </ul>

      {/* ── Summary footer ──────────────────────────────────────────────── */}
      <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Average</p>
          <p className="text-lg md:text-xl font-bold text-white">
            {average !== null ? `${average} pts` : '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Trend</p>
          <TrendBadge trend={trend} />
        </div>
      </div>
    </div>
  )
}
