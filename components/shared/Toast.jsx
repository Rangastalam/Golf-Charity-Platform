'use client'

/**
 * @fileoverview Global toast notification system.
 *
 * Provider + context + hook:
 *   const toast = useToast()
 *   toast.success('Score saved!')
 *   toast.error('Something went wrong.')
 *   toast.warning('Check your details.')
 *   toast.info('Draw results are in.')
 *
 * Position: top-right on desktop (sm+), top-center on mobile.
 * Auto-dismisses after 4 seconds. Stacks up to 5 toasts.
 * Framer Motion slide-in animation.
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

const AUTO_DISMISS_MS = 4000
const MAX_TOASTS      = 5

/**
 * @param {{ children: React.ReactNode }} props
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers              = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    setToasts((prev) => {
      const next = [...prev, { id, message, type }]
      // Cap at MAX_TOASTS — drop the oldest if needed
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
    })

    timers.current[id] = setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    return id
  }, [dismiss])

  const api = {
    success: (msg) => add(msg, 'success'),
    error:   (msg) => add(msg, 'error'),
    warning: (msg) => add(msg, 'warning'),
    info:    (msg) => add(msg, 'info'),
    dismiss,
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the toast API: { success, error, warning, info, dismiss }.
 * Must be called inside a component wrapped by <ToastProvider>.
 *
 * @returns {{ success: (msg: string)=>void, error: (msg: string)=>void, warning: (msg: string)=>void, info: (msg: string)=>void, dismiss: (id: string)=>void }}
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>')
  }
  return ctx
}

// ─── Container ────────────────────────────────────────────────────────────────

/**
 * Fixed overlay that holds all active toasts.
 * Top-right on sm+, top-center on mobile (< sm).
 *
 * @param {{ toasts: Array, onDismiss: (id: string)=>void }} props
 */
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="
        fixed z-[200] top-4 inset-x-4
        flex flex-col items-center gap-2
        pointer-events-none
        sm:inset-x-auto sm:right-4 sm:left-auto sm:items-end sm:w-80
      "
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── Individual toast ─────────────────────────────────────────────────────────

const TOAST_STYLES = {
  success: {
    container: 'bg-gray-950 border-green-500/40',
    icon:      'text-green-400',
    text:      'text-green-100',
    path: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  error: {
    container: 'bg-gray-950 border-red-500/40',
    icon:      'text-red-400',
    text:      'text-red-100',
    path: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
  },
  warning: {
    container: 'bg-gray-950 border-amber-500/40',
    icon:      'text-amber-400',
    text:      'text-amber-100',
    path: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
  },
  info: {
    container: 'bg-gray-950 border-blue-500/40',
    icon:      'text-blue-400',
    text:      'text-blue-100',
    path: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
  },
}

/**
 * @param {{ toast: { id: string, message: string, type: string }, onDismiss: (id: string)=>void }} props
 */
function Toast({ toast, onDismiss }) {
  const style = TOAST_STYLES[toast.type] ?? TOAST_STYLES.info

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      exit={{   opacity: 0, y: -8,  scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      role="alert"
      className={`
        pointer-events-auto w-full
        flex items-start gap-3 rounded-xl border px-4 py-3
        shadow-2xl shadow-black/40 backdrop-blur
        ${style.container}
      `}
    >
      {/* Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${style.icon}`}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={style.path} />
      </svg>

      {/* Message */}
      <p className={`flex-1 text-sm font-medium leading-snug ${style.text}`}>
        {toast.message}
      </p>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 -mr-1 p-1 rounded-md text-gray-500 hover:text-gray-300 transition-colors"
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
    </motion.div>
  )
}
