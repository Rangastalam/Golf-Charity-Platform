/**
 * @fileoverview Input validation and sanitisation utilities.
 *
 * All validators return { valid: boolean, error: string }.
 * Sanitisers strip HTML and limit length before DB insertion.
 * Use sanitizeObject to prevent mass-assignment vulnerabilities.
 */

// ─── Sanitisation ─────────────────────────────────────────────────────────────

/**
 * Trims whitespace, strips all HTML tags and common entities, and limits
 * the string to a maximum byte length.
 *
 * @param {unknown}  input
 * @param {number}  [maxLength=1000]
 * @returns {string}
 */
export function sanitizeString(input, maxLength = 1000) {
  const s = typeof input === 'string' ? input : String(input ?? '')
  return s
    .trim()
    .replace(/<[^>]*>/g, '')          // strip HTML tags
    .replace(/&(?:[a-z]+|#\d+);/gi, ' ')  // strip HTML entities
    .slice(0, maxLength)
}

/**
 * Returns a new object containing only the allowed keys, with all string
 * values sanitized. Prevents mass-assignment attacks.
 *
 * @param {Record<string, unknown>} obj
 * @param {string[]}                allowedKeys
 * @returns {Record<string, unknown>}
 */
export function sanitizeObject(obj, allowedKeys) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {}
  const result = {}
  for (const key of allowedKeys) {
    if (!(key in obj)) continue
    const val = obj[key]
    result[key] = typeof val === 'string' ? sanitizeString(val) : val
  }
  return result
}

// ─── Validators ───────────────────────────────────────────────────────────────

/**
 * Validates an email address.
 *
 * @param {unknown} email
 * @returns {{ valid: boolean, error: string }}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string' || !email.trim()) {
    return { valid: false, error: 'Email is required.' }
  }
  const trimmed = email.trim()
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email address is too long.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address.' }
  }
  return { valid: true, error: '' }
}

/**
 * Validates a password: min 8 characters, at least one digit.
 *
 * @param {unknown} password
 * @returns {{ valid: boolean, error: string }}
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' }
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters.' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number.' }
  }
  return { valid: true, error: '' }
}

/**
 * Validates a Stableford golf score: whole integer between 1 and 45.
 *
 * @param {unknown} score
 * @returns {{ valid: boolean, error: string }}
 */
export function validateScore(score) {
  const n = Number(score)
  if (!Number.isInteger(n)) {
    return { valid: false, error: 'Score must be a whole number.' }
  }
  if (n < 1 || n > 45) {
    return { valid: false, error: 'Score must be between 1 and 45.' }
  }
  return { valid: true, error: '' }
}

/**
 * Validates a UUID v4 string.
 *
 * @param {unknown} id
 * @returns {boolean}
 */
export function validateUUID(id) {
  if (typeof id !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

/**
 * Validates a monetary amount: positive number, max 2 decimal places.
 *
 * @param {unknown} amount
 * @returns {{ valid: boolean, error: string }}
 */
export function validateAmount(amount) {
  const n = Number(amount)
  if (isNaN(n) || !isFinite(n)) {
    return { valid: false, error: 'Amount must be a valid number.' }
  }
  if (n <= 0) {
    return { valid: false, error: 'Amount must be greater than zero.' }
  }
  if (!/^\d+(\.\d{1,2})?$/.test(String(parseFloat(n.toFixed(2))))) {
    return { valid: false, error: 'Amount must have no more than 2 decimal places.' }
  }
  return { valid: true, error: '' }
}

/**
 * Validates a contribution percentage: 10–100.
 *
 * @param {unknown} pct
 * @returns {{ valid: boolean, error: string }}
 */
export function validateContributionPercentage(pct) {
  const n = Number(pct)
  if (isNaN(n)) {
    return { valid: false, error: 'Contribution percentage must be a number.' }
  }
  if (n < 10) {
    return { valid: false, error: 'Contribution percentage must be at least 10.' }
  }
  if (n > 100) {
    return { valid: false, error: 'Contribution percentage cannot exceed 100.' }
  }
  return { valid: true, error: '' }
}

/**
 * Validates a draw month string in YYYY-MM format.
 *
 * @param {unknown} month
 * @returns {{ valid: boolean, error: string }}
 */
export function validateMonth(month) {
  if (!month || typeof month !== 'string') {
    return { valid: false, error: 'Month is required.' }
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return { valid: false, error: 'Month must be in YYYY-MM format (e.g. 2025-06).' }
  }
  return { valid: true, error: '' }
}

/**
 * Validates an image MIME type against its actual magic bytes.
 * Prevents MIME spoofing by checking the binary signature of the file.
 *
 * Supported: JPEG (FF D8 FF), PNG (89 50 4E 47), WebP (RIFF....WEBP)
 *
 * @param {ArrayBuffer} buffer  Raw file bytes
 * @param {string}      mimeType  Browser-reported MIME type
 * @returns {{ valid: boolean, error: string }}
 */
export function validateImageMagicBytes(buffer, mimeType) {
  const bytes = new Uint8Array(buffer.slice(0, 12))

  const isJPEG = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isPNG  = bytes[0] === 0x89 && bytes[1] === 0x50 &&
                 bytes[2] === 0x4e && bytes[3] === 0x47 &&
                 bytes[4] === 0x0d && bytes[5] === 0x0a
  // WebP: bytes 0-3 = "RIFF", bytes 8-11 = "WEBP"
  const isWebP = bytes[0] === 0x52 && bytes[1] === 0x49 &&
                 bytes[2] === 0x46 && bytes[3] === 0x46 &&
                 bytes[8] === 0x57 && bytes[9] === 0x45 &&
                 bytes[10] === 0x42 && bytes[11] === 0x50

  const signatureMatch =
    (isJPEG && (mimeType === 'image/jpeg' || mimeType === 'image/jpg')) ||
    (isPNG  && mimeType === 'image/png') ||
    (isWebP && mimeType === 'image/webp')

  if (!signatureMatch) {
    return {
      valid: false,
      error: 'File content does not match its declared type. Only genuine JPEG, PNG, and WebP images are accepted.',
    }
  }
  return { valid: true, error: '' }
}
