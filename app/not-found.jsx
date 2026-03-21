/**
 * @fileoverview Custom 404 page — on-brand dark theme.
 */

'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ROUTES } from '@/constants'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 text-center">
      {/* Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_50%_50%,rgba(251,191,36,0.06),transparent)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 24 }}
        className="relative z-10 max-w-md"
      >
        {/* Big 404 */}
        <motion.p
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 18 }}
          className="text-8xl md:text-9xl font-black text-amber-400/20 leading-none mb-2 select-none"
        >
          404
        </motion.p>

        {/* Icon */}
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="text-5xl mb-5"
        >
          ⛳
        </motion.div>

        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          Looks like this hole doesn't exist
        </h1>
        <p className="text-gray-400 text-sm md:text-base mb-8 leading-relaxed">
          The page you're looking for has either moved or never existed. Let's get you back on the fairway.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={ROUTES.HOME}
            className="px-7 py-3.5 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black text-sm rounded-2xl transition-all hover:scale-105 min-h-[48px] flex items-center justify-center"
          >
            Back to Homepage
          </Link>
          <Link
            href={ROUTES.HOW_IT_WORKS}
            className="px-7 py-3.5 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white font-semibold text-sm rounded-2xl transition-colors min-h-[48px] flex items-center justify-center"
          >
            How It Works
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
