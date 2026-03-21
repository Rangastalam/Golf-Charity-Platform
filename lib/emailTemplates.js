/**
 * @fileoverview HTML email templates — all inline-styled for email client compatibility.
 *
 * Each function returns { subject, html }.
 * Max width 600px, white background, brand amber accent.
 * No external CSS — every style is inline.
 */

const APP_NAME = 'GolfGives'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://golfgives.com'

// ─── Shared layout wrappers ───────────────────────────────────────────────────

function layout(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:#0f0f11;border-radius:16px 16px 0 0;padding:24px 32px;text-align:center;">
              <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                Golf<span style="color:#fbbf24;">Gives</span>
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
              <p style="margin:0;font-size:11px;color:#d1d5db;">
                40% of every subscription goes to verified charities.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function btn(text, href, bg = '#fbbf24', color = '#1c1917') {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:12px;background:${bg};">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:${color};text-decoration:none;border-radius:12px;">${text}</a>
      </td>
    </tr>
  </table>`
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />`
}

function infoRow(label, value, valueColor = '#111827') {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
      <span style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${label}</span><br/>
      <span style="font-size:15px;color:${valueColor};font-weight:600;">${value}</span>
    </td>
  </tr>`
}

function h1(text) {
  return `<h1 style="margin:0 0 12px;font-size:26px;font-weight:900;color:#111827;line-height:1.2;">${text}</h1>`
}

function p(text, style = '') {
  return `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;${style}">${text}</p>`
}

// ─── 1. Welcome Email ─────────────────────────────────────────────────────────

/**
 * @param {{ userName: string, loginUrl?: string }} opts
 */
export function welcomeEmail({ userName, loginUrl = `${BASE_URL}/dashboard` }) {
  const subject = `Welcome to ${APP_NAME} 🎯`
  const html = layout(`
    ${h1(`Welcome to GolfGives, ${userName}!`)}
    ${p('You\'ve joined a community of golfers who play, win, and give back — every single month. Here\'s what to do next:')}

    <table cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;">
      ${[
        { icon: '1️⃣', title: 'Subscribe', desc: 'Choose a plan — from ₹999/month. 40% goes directly to charity.' },
        { icon: '2️⃣', title: 'Enter Your Scores', desc: 'Log your Stableford scores after each round. Your best 5 form your draw ticket.' },
        { icon: '3️⃣', title: 'Pick Your Charity', desc: 'Choose which registered charity to champion. Your contribution goes there.' },
        { icon: '4️⃣', title: 'Enter the Draw', desc: 'On the 28th of every month, five numbers are drawn. Match 3, 4, or 5 to win.' },
      ].map(({ icon, title, desc }) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
            <span style="font-size:20px;">${icon}</span>
            <strong style="display:block;font-size:14px;color:#111827;margin:4px 0 2px;">${title}</strong>
            <span style="font-size:13px;color:#6b7280;">${desc}</span>
          </td>
        </tr>`).join('')}
    </table>

    ${btn('Go to Dashboard', loginUrl)}

    ${divider()}
    ${p(`Questions? Just reply to this email. We're a small team who actually reads every message.`, 'font-size:13px;color:#9ca3af;')}
  `)
  return { subject, html }
}

// ─── 2. Subscription Confirmed ────────────────────────────────────────────────

/**
 * @param {{ userName: string, plan: string, renewalDate: string, charityName: string, contributionAmount: number }} opts
 */
export function subscriptionConfirmEmail({ userName, plan, renewalDate, charityName, contributionAmount }) {
  const subject = `Subscription Confirmed — Welcome to ${APP_NAME}!`
  const html = layout(`
    ${h1('You\'re all set!')}
    ${p(`Hi ${userName}, your <strong style="color:#111827;">${plan}</strong> subscription is now active. Here's a summary:`)}

    <table cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;">
      ${infoRow('Plan', plan)}
      ${infoRow('Renewal Date', renewalDate)}
      ${infoRow('Charity Contribution', `₹${Number(contributionAmount).toLocaleString('en-IN')} → ${charityName}`, '#e11d48')}
      ${infoRow('Prize Pool Contribution', '40% of your subscription')}
    </table>

    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:16px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#92400e;">
        🎗️ <strong>₹${Number(contributionAmount).toLocaleString('en-IN')}</strong> from your subscription goes to <strong>${charityName}</strong> this month — automatically.
      </p>
    </div>

    ${btn('Go to Dashboard', `${BASE_URL}/dashboard`)}

    ${divider()}
    ${p('Your first draw entry is registered for this month\'s draw on the 28th. Good luck!', 'font-size:13px;color:#6b7280;')}
  `)
  return { subject, html }
}

// ─── 3. Subscription Cancelled ────────────────────────────────────────────────

/**
 * @param {{ userName: string, endDate: string }} opts
 */
export function subscriptionCancelledEmail({ userName, endDate }) {
  const subject = 'Your GolfGives Subscription Has Been Cancelled'
  const html = layout(`
    ${h1('Subscription cancelled')}
    ${p(`Hi ${userName}, your subscription has been cancelled as requested.`)}

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;">Full access until</p>
      <p style="margin:0;font-size:22px;font-weight:900;color:#111827;">${endDate}</p>
    </div>

    ${p('Until then you can still:')}
    <ul style="margin:0 0 20px;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
      <li>Submit scores and entries for this month's draw</li>
      <li>View your full score history</li>
      <li>Track your charity contributions</li>
    </ul>

    ${p('Changed your mind? You can resubscribe any time.')}

    ${btn('Resubscribe', `${BASE_URL}/pricing`, '#fbbf24', '#1c1917')}

    ${divider()}
    ${p('We\'re sorry to see you go. If there\'s anything we could have done better, please let us know.', 'font-size:13px;color:#9ca3af;')}
  `)
  return { subject, html }
}

// ─── 4. Subscription Lapsed ───────────────────────────────────────────────────

/**
 * @param {{ userName: string, resubscribeUrl?: string }} opts
 */
export function subscriptionLapsedEmail({ userName, resubscribeUrl = `${BASE_URL}/pricing` }) {
  const subject = 'Your GolfGives Subscription Has Lapsed'
  const html = layout(`
    ${h1('Your subscription has lapsed')}
    ${p(`Hi ${userName}, we weren't able to process your latest payment and your subscription has lapsed.`)}

    ${p('Your score history and account data are safely saved. To restore full access and keep your draw entries active, update your payment details and resubscribe.')}

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#9a3412;">
        ⚠️ You won't receive draw entries for months when your subscription is lapsed.
      </p>
    </div>

    ${btn('Resubscribe Now', resubscribeUrl)}

    ${divider()}
    ${p('If you believe this is an error or need help updating your payment method, reply to this email.', 'font-size:13px;color:#9ca3af;')}
  `)
  return { subject, html }
}

// ─── 5. Draw Results ──────────────────────────────────────────────────────────

/**
 * @param {{
 *   userName: string, month: string, drawnNumbers: number[],
 *   matchResult: 'five_match'|'four_match'|'three_match'|null,
 *   prizeAmount?: number, nextDrawDate: string
 * }} opts
 */
export function drawResultsEmail({ userName, month, drawnNumbers, matchResult, prizeAmount, nextDrawDate }) {
  const isWinner   = !!matchResult
  const matchLabel = { five_match: '5 numbers', four_match: '4 numbers', three_match: '3 numbers' }[matchResult] ?? ''

  const subject = `Draw Results — ${month} | ${APP_NAME}`
  const html = layout(`
    ${h1(`${month} Draw Results`)}
    ${p(`Hi ${userName}, the monthly draw has taken place. Here are the results:`)}

    <!-- Drawn numbers -->
    <div style="background:#0f0f11;border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 14px;font-size:12px;color:#9ca3af;text-transform:uppercase;font-weight:600;letter-spacing:0.08em;">Drawn Numbers</p>
      <div style="display:inline-flex;gap:10px;flex-wrap:wrap;justify-content:center;">
        ${(drawnNumbers ?? []).map((n) => `
          <span style="display:inline-block;width:44px;height:44px;border-radius:50%;background:#fbbf24;color:#1c1917;font-weight:900;font-size:16px;line-height:44px;text-align:center;">${n}</span>
        `).join('')}
      </div>
    </div>

    ${isWinner ? `
      <!-- Winner message -->
      <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
        <p style="margin:0 0 8px;font-size:28px;">🏆</p>
        <p style="margin:0 0 8px;font-size:18px;font-weight:900;color:#15803d;">You matched ${matchLabel}!</p>
        <p style="margin:0;font-size:24px;font-weight:900;color:#111827;">Prize: ₹${Number(prizeAmount ?? 0).toLocaleString('en-IN')}</p>
      </div>
      ${p('Congratulations! You\'ll receive a separate email with instructions to claim your prize. Please check your inbox.')}
    ` : `
      <!-- No match message -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
        <p style="margin:0 0 8px;font-size:22px;">⛳</p>
        <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#374151;">No match this month</p>
        <p style="margin:0;font-size:14px;color:#6b7280;">Keep entering your scores — every round improves your next draw ticket.</p>
      </div>
      ${p(`Next draw: <strong style="color:#111827;">${nextDrawDate}</strong>. Keep playing!`)}
    `}

    ${btn('View Full Results', `${BASE_URL}/dashboard`)}

    ${divider()}
    ${p('Regardless of the draw result, your charity contribution has already been sent this month. Thank you.', 'font-size:13px;color:#6b7280;')}
  `)
  return { subject, html }
}

// ─── 6. Winner Alert ──────────────────────────────────────────────────────────

/**
 * @param {{ userName: string, matchType: string, prizeAmount: number, uploadProofUrl: string }} opts
 */
export function winnerAlertEmail({ userName, matchType, prizeAmount, uploadProofUrl }) {
  const matchLabel = { five_match: '5 Number Match (Jackpot)', four_match: '4 Number Match', three_match: '3 Number Match' }[matchType] ?? matchType.replace('_', ' ')
  const subject = `🏆 You Won ₹${Number(prizeAmount).toLocaleString('en-IN')}!`
  const html = layout(`
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:56px;">🏆</span>
      ${h1(`You won, ${userName}!`)}
    </div>

    <div style="background:linear-gradient(135deg,#451a03,#1c1917);border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;color:#fde68a;text-transform:uppercase;font-weight:600;letter-spacing:0.08em;">${matchLabel}</p>
      <p style="margin:0;font-size:36px;font-weight:900;color:#fbbf24;">₹${Number(prizeAmount).toLocaleString('en-IN')}</p>
    </div>

    ${p('To receive your prize, you need to upload proof of your bank details. This is a one-time security step.')}

    <table cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;">
      ${[
        { step: '1', text: 'Click the button below to go to your winner dashboard' },
        { step: '2', text: 'Upload a photo of your bank passbook or cheque leaf' },
        { step: '3', text: 'Our team verifies it within 24 hours' },
        { step: '4', text: 'Payment sent within 5 business days' },
      ].map(({ step, text }) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
            <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#fbbf24;color:#1c1917;font-weight:900;font-size:12px;text-align:center;line-height:24px;margin-right:10px;">${step}</span>
            <span style="font-size:14px;color:#374151;">${text}</span>
          </td>
        </tr>`).join('')}
    </table>

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#9a3412;">
        ⏰ Please upload your proof within <strong>7 days</strong> to claim your prize.
      </p>
    </div>

    ${btn('Upload Proof Now', uploadProofUrl)}

    ${divider()}
    ${p('This is a genuine prize notification from GolfGives. We will never ask for your full card number or passwords.', 'font-size:12px;color:#9ca3af;')}
  `)
  return { subject, html }
}

// ─── 7. Proof Verified ────────────────────────────────────────────────────────

/**
 * @param {{ userName: string, prizeAmount: number, paymentMethod?: string }} opts
 */
export function proofVerifiedEmail({ userName, prizeAmount, paymentMethod = 'Bank Transfer' }) {
  const subject = 'Proof Verified — Your Prize Payment Is Being Processed'
  const html = layout(`
    ${h1('Proof accepted!')}
    ${p(`Hi ${userName}, we've verified your bank details. Your prize payment is now being processed.`)}

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin:20px 0;">
      <table cellpadding="0" cellspacing="0" width="100%">
        ${infoRow('Prize Amount', `₹${Number(prizeAmount).toLocaleString('en-IN')}`, '#15803d')}
        ${infoRow('Payment Method', paymentMethod)}
        ${infoRow('Expected Timeline', '5 business days')}
      </table>
    </div>

    ${p('You\'ll receive one more email when the payment has been sent to your account.')}

    ${btn('View Dashboard', `${BASE_URL}/dashboard`)}

    ${divider()}
    ${p('If you have any questions about your payment, reply to this email with your winner reference number.', 'font-size:13px;color:#9ca3af;')}
  `)
  return { subject, html }
}

// ─── 8. Payment Sent ──────────────────────────────────────────────────────────

/**
 * @param {{ userName: string, prizeAmount: number, paymentReference: string }} opts
 */
export function paymentSentEmail({ userName, prizeAmount, paymentReference }) {
  const subject = 'Your GolfGives Prize Has Been Sent! 🎉'
  const html = layout(`
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:48px;">🎉</span>
    </div>
    ${h1('Payment sent!')}
    ${p(`Hi ${userName}, your prize has been transferred to your bank account.`)}

    <div style="background:#0f0f11;border-radius:12px;padding:24px;margin:20px 0;">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #1f2937;">
            <span style="font-size:12px;color:#9ca3af;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;">Amount Transferred</span><br/>
            <span style="font-size:28px;font-weight:900;color:#fbbf24;">₹${Number(prizeAmount).toLocaleString('en-IN')}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <span style="font-size:12px;color:#9ca3af;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;">Payment Reference</span><br/>
            <span style="font-size:15px;font-weight:600;color:#ffffff;font-family:monospace;">${paymentReference}</span>
          </td>
        </tr>
      </table>
    </div>

    ${p('The funds should appear in your account within 1–2 business days depending on your bank.')}
    ${p('Thank you for playing GolfGives — and for giving back while you win. See you in next month\'s draw! ⛳')}

    ${btn('Play Again Next Month', `${BASE_URL}/dashboard`)}
  `)
  return { subject, html }
}

// ─── 9. Charity Contribution ──────────────────────────────────────────────────

/**
 * @param {{ userName: string, charityName: string, contributionAmount: number, month: string }} opts
 */
export function charityContributionEmail({ userName, charityName, contributionAmount, month }) {
  const subject = `Your ${month} Charity Contribution — ${charityName}`
  const html = layout(`
    ${h1('Your impact this month')}
    ${p(`Hi ${userName}, here's what your GolfGives subscription did for charity in ${month}:`)}

    <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:16px;padding:28px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 6px;font-size:13px;color:#9f1239;text-transform:uppercase;font-weight:600;letter-spacing:0.08em;">Your contribution to</p>
      <p style="margin:0 0 16px;font-size:20px;font-weight:900;color:#111827;">${charityName}</p>
      <p style="margin:0;font-size:40px;font-weight:900;color:#e11d48;">₹${Number(contributionAmount).toLocaleString('en-IN')}</p>
    </div>

    ${p('This amount has been transferred to ' + charityName + ' as part of this month\'s collective donation from all GolfGives members.')}
    ${p('Every round you play, every score you log — it all adds up to real change.')}

    ${btn('View Charity Profile', `${BASE_URL}/charities`)}

    ${divider()}
    ${p('Thank you for being part of the GolfGives community. Together, we\'re doing something genuinely good.', 'font-size:14px;color:#374151;font-style:italic;')}
  `)
  return { subject, html }
}
