'use client'

/**
 * @fileoverview Client wrapper that coordinates shared score state between
 * ScoreEntry and ScoreList on the /dashboard/scores page.
 *
 * Receives initialScores from the server component and owns the mutable state.
 * Both child components read from and write to this shared state without
 * lifting state further up into a server component.
 *
 * @param {{ initialScores: Array<{ id: string, score: number, played_at: string, created_at: string }> }} props
 */

import { useState } from 'react'
import ScoreEntry from '@/components/dashboard/ScoreEntry'
import ScoreList from '@/components/dashboard/ScoreList'

export default function ScoreManager({ initialScores }) {
  const [scores, setScores] = useState(initialScores ?? [])

  return (
    <div className="space-y-6">
      {/* Score entry form */}
      <ScoreEntry onScoreAdded={setScores} />

      {/* Score list with edit/delete */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
        <h2 className="text-base font-semibold text-white mb-4">
          Your rounds{' '}
          <span className="text-sm font-normal text-gray-400">
            ({scores.length}/5)
          </span>
        </h2>
        <ScoreList scores={scores} onScoresChange={setScores} />
      </div>
    </div>
  )
}
