'use client'

/**
 * @fileoverview Client-side provider wrapper.
 *
 * Groups all React context providers and the global ErrorBoundary into a
 * single client component so the root layout (a server component) stays clean.
 *
 * Add new providers here — not in app/layout.js.
 */

import ErrorBoundary from '@/components/shared/ErrorBoundary'
import { ToastProvider } from '@/components/shared/Toast'

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function Providers({ children }) {
  return (
    <ToastProvider>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </ToastProvider>
  )
}
