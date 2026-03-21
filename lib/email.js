/**
 * @fileoverview Core email sending utility using Resend.
 *
 * Never throws — always returns { success, messageId?, error? }.
 * Logs attempts in development.
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.EMAIL_FROM ?? 'GolfGives <noreply@golfgives.com>'

/**
 * Sends an email via Resend.
 *
 * @param {{
 *   to:      string | string[],
 *   subject: string,
 *   html:    string,
 *   replyTo?: string,
 * }} options
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export async function sendEmail({ to, subject, html, replyTo }) {

  if (!process.env.RESEND_API_KEY) {
    const msg = 'RESEND_API_KEY is not configured'
    console.error('[email]', msg)
    return { success: false, error: msg }
  }

  try {
    const payload = {
      from:    FROM,
      to:      Array.isArray(to) ? to : [to],
      subject,
      html,
    }
    if (replyTo) payload.replyTo = replyTo

    const { data, error } = await resend.emails.send(payload)

    if (error) {
      console.error('[email] Resend error:', error)
      return { success: false, error: error.message ?? String(error) }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[email] Unexpected error:', msg)
    return { success: false, error: msg }
  }
}
