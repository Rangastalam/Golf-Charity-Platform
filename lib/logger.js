/**
 * @fileoverview Application logger.
 *
 * Development: coloured console output for readability.
 * Production:  newline-delimited JSON to stdout/stderr —
 *              compatible with log-aggregation platforms (Datadog, Logtail, etc.).
 *
 * NEVER log: passwords, API keys, card numbers, full auth tokens.
 */

const IS_DEV  = process.env.NODE_ENV !== 'production'
const IS_TEST = process.env.NODE_ENV === 'test'

// ANSI colour codes — no-op outside TTY
const C = {
  reset:   '\x1b[0m',
  info:    '\x1b[36m',   // cyan
  warn:    '\x1b[33m',   // yellow
  error:   '\x1b[31m',   // red
  debug:   '\x1b[35m',   // magenta
  dim:     '\x1b[2m',
}

// ─── Core logger ──────────────────────────────────────────────────────────────

/**
 * Logs a structured message at the given level.
 *
 * @param {'info'|'warn'|'error'|'debug'} level
 * @param {string}  message
 * @param {unknown} [data]
 */
export function log(level, message, data) {
  // Suppress output in tests unless NODE_DEBUG is set
  if (IS_TEST && !process.env.NODE_DEBUG) return

  if (IS_DEV) {
    const color = C[level] ?? C.info
    const ts    = new Date().toISOString().slice(11, 23) // HH:MM:SS.mmm
    const extra = data !== undefined ? ` ${C.dim}${JSON.stringify(data)}${C.reset}` : ''
    console.log(`${C.dim}${ts}${C.reset} ${color}[${level.toUpperCase()}]${C.reset} ${message}${extra}`)
    return
  }

  // Production: structured JSON
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(data !== undefined ? { data } : {}),
  }

  const line = JSON.stringify(entry) + '\n'
  if (level === 'error') {
    process.stderr?.write(line)
  } else {
    process.stdout?.write(line)
  }
}

// ─── Convenience shorthands ───────────────────────────────────────────────────

/** @param {string} msg @param {unknown} [data] */
export const info  = (msg, data) => log('info',  msg, data)

/** @param {string} msg @param {unknown} [data] */
export const warn  = (msg, data) => log('warn',  msg, data)

/** @param {string} msg @param {unknown} [data] */
export const debug = (msg, data) => log('debug', msg, data)

// ─── Specialised helpers ──────────────────────────────────────────────────────

/**
 * Logs an HTTP API request.
 *
 * @param {string} method
 * @param {string} path
 * @param {number} status
 * @param {number} durationMs
 */
export function logAPIRequest(method, path, status, durationMs) {
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
  log(level, `${method} ${path} → ${status}`, { durationMs })
}

/**
 * Logs an error with surrounding context.
 * Includes the stack trace in development only.
 *
 * @param {unknown} err
 * @param {string|Record<string, unknown>} [context]
 */
export function logError(err, context) {
  const message = err instanceof Error ? err.message : String(err)
  const stack   = IS_DEV && err instanceof Error ? err.stack : undefined

  log('error', message, {
    ...(context !== undefined ? (typeof context === 'string' ? { context } : context) : {}),
    ...(stack ? { stack } : {}),
  })
}
