'use client'

/**
 * @fileoverview React error boundary component.
 *
 * Catches JavaScript errors thrown by any child component tree and renders
 * a friendly fallback UI instead of a blank screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 *
 * Or with a custom fallback:
 *   <ErrorBoundary fallback={<p>Custom error UI</p>}>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */

import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    /** @type {{ hasError: boolean, error: Error|null }} */
    this.state = { hasError: false, error: null }
  }

  /**
   * Update state to trigger fallback UI on next render.
   *
   * @param {Error} error
   * @returns {{ hasError: boolean, error: Error }}
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  /**
   * Log the error in development; in production report to your monitoring
   * service here (e.g. Sentry.captureException(error)).
   *
   * @param {Error}                    error
   * @param {{ componentStack: string }} info
   */
  componentDidCatch(error, info) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error)
      console.error('[ErrorBoundary] Component stack:', info.componentStack)
    }
    // TODO: forward to your error-tracking service in production
    // e.g. Sentry.captureException(error, { extra: info })
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    const { hasError } = this.state
    const { children, fallback } = this.props

    if (!hasError) return children

    // Allow a custom fallback prop
    if (fallback) return fallback

    return (
      <div
        role="alert"
        className="min-h-[300px] flex flex-col items-center justify-center px-6 py-12 text-center"
      >
        {/* Icon */}
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7 text-rose-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          Something went wrong
        </h2>
        <p className="mb-6 max-w-sm text-sm text-gray-500 leading-relaxed">
          An unexpected error occurred. Our team has been notified. You can
          try reloading the page or come back later.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={this.handleRetry}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Try again
          </button>
          <button
            onClick={this.handleReload}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            Reload page
          </button>
        </div>

        {/* Dev-only error details */}
        {process.env.NODE_ENV === 'development' && this.state.error && (
          <details className="mt-6 w-full max-w-lg text-left">
            <summary className="cursor-pointer text-xs font-mono text-gray-400 hover:text-gray-600">
              Error details (dev only)
            </summary>
            <pre className="mt-2 overflow-auto rounded-lg bg-gray-100 p-3 text-xs text-red-700 font-mono">
              {this.state.error.toString()}
            </pre>
          </details>
        )}
      </div>
    )
  }
}
