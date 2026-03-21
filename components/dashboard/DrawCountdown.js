/**
 * @fileoverview Countdown to the next monthly draw.
 * Client component — updates every second.
 *
 * @param {{ drawDate: Date }} props
 */

'use client'

import { useEffect, useState } from 'react'

/**
 * @param {{ drawDate: Date }} props
 */
export default function DrawCountdown({ drawDate }) {
  // Initialise to null so server and client render the same placeholder,
  // then populate on the client inside useEffect to avoid a hydration mismatch.
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    setTimeLeft(getTimeLeft(drawDate))
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(drawDate))
    }, 1000)
    return () => clearInterval(timer)
  }, [drawDate])

  const drawDateStr = drawDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="bg-green-950 rounded-2xl p-6 text-white flex flex-col">
      <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">
        Next draw
      </p>
      <p className="text-lg font-bold mb-4">{drawDateStr}</p>

      <div className="grid grid-cols-4 gap-2 flex-1 items-center">
        {[
          { value: timeLeft?.days ?? null, label: 'Days' },
          { value: timeLeft?.hours ?? null, label: 'Hrs' },
          { value: timeLeft?.minutes ?? null, label: 'Min' },
          { value: timeLeft?.seconds ?? null, label: 'Sec' },
        ].map(({ value, label }) => (
          <div key={label} className="text-center">
            <div className="bg-green-900 rounded-xl py-2 px-1">
              <span className="text-2xl font-black tabular-nums">
                {value === null ? '--' : String(value).padStart(2, '0')}
              </span>
            </div>
            <p className="text-xs text-green-400 mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Calculates time remaining until a target date.
 *
 * @param {Date} target
 * @returns {{ days: number, hours: number, minutes: number, seconds: number }}
 */
function getTimeLeft(target) {
  const diff = Math.max(0, target.getTime() - Date.now())
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds }
}
