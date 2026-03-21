/**
 * @fileoverview Animated counter — counts from 0 to value on mount.
 *
 * @param {{
 *   value: number,
 *   label: string,
 *   prefix?: string,
 *   suffix?: string,
 *   duration?: number
 * }} props
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

function formatNumber(n) {
  return Math.floor(n).toLocaleString('en-IN')
}

export default function HeroCounter({ value, label, prefix = '', suffix = '', duration = 2 }) {
  const [display, setDisplay] = useState(0)
  const ref      = useRef(null)
  const inView   = useInView(ref, { once: true, margin: '-80px' })
  const rafRef   = useRef(null)

  useEffect(() => {
    if (!inView || value === 0) return

    const start     = performance.now()
    const startVal  = 0

    function tick(now) {
      const elapsed  = (now - start) / 1000           // seconds
      const progress = Math.min(elapsed / duration, 1) // 0→1
      // Ease out cubic
      const eased    = 1 - Math.pow(1 - progress, 3)
      setDisplay(startVal + (value - startVal) * eased)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(value)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [inView, value, duration])

  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl md:text-4xl lg:text-5xl font-black text-white tabular-nums leading-none">
        {prefix}{formatNumber(display)}{suffix}
      </p>
      <p className="text-xs md:text-sm text-amber-300/80 font-medium mt-2 uppercase tracking-widest">
        {label}
      </p>
    </div>
  )
}
