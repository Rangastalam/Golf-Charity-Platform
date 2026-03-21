'use client'

/**
 * @fileoverview Reusable inline error/warning/info/success message component.
 *
 * Animated entrance via Framer Motion. Optionally dismissable.
 *
 * Usage:
 *   <ErrorMessage message="Something went wrong" type="error" />
 *   <ErrorMessage message="Saved!" type="success" onDismiss={() => setMsg(null)} />
 */

import { motion, AnimatePresence } from 'framer-motion'

/**
 * @param {{
 *   message:    string | null | undefined,
 *   type?:      'error' | 'warning' | 'info' | 'success',
 *   onDismiss?: () => void,
 *   className?: string,
 * }} props
 */
export default function ErrorMessage({
  message,
  type      = 'error',
  onDismiss,
  className = '',
}) {
  const STYLES = {
    error:   'bg-red-50    border-red-200    text-red-700',
    warning: 'bg-amber-50  border-amber-200  text-amber-700',
    info:    'bg-blue-50   border-blue-200   text-blue-700',
    success: 'bg-green-50  border-green-200  text-green-700',
  }

  const ICONS = {
    error:   'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
    warning: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
    info:    'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
    success: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  }

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0,  height: 'auto' }}
          exit={{   opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`overflow-hidden ${className}`}
        >
          <div
            className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${STYLES[type] ?? STYLES.error}`}
          >
            {/* Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[type] ?? ICONS.error} />
            </svg>

            {/* Message */}
            <span className="flex-1 leading-snug">{message}</span>

            {/* Dismiss button */}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss"
                className="flex-shrink-0 -mr-0.5 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                  aria-hidden="true"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
