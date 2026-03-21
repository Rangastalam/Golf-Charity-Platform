/**
 * @fileoverview Member winnings page.
 *
 * Shows the full winnings history, verification process explanation,
 * and wraps the overview in SubscriptionGuard.
 */

import SubscriptionGuard from '@/components/shared/SubscriptionGuard'
import WinningsOverview from '@/components/dashboard/WinningsOverview'

export const metadata = {
  title: 'My Winnings',
}

export default function WinningsPage() {
  return (
    <div className="space-y-6 md:space-y-10 max-w-3xl">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">My Winnings</h1>
        <p className="text-gray-500 mt-1 text-xs md:text-sm">
          Your prize history, verification status, and payment records.
        </p>
      </div>

      {/* ── How verification works ────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
        <h2 className="text-sm md:text-base font-bold text-gray-900 mb-4 md:mb-5">
          How prize verification works
        </h2>
        <ol className="space-y-4">
          {[
            {
              step:  '1',
              icon:  '🎰',
              title: 'Win is detected automatically',
              body:  'After each monthly draw, our system checks every member\'s submitted scores against the drawn numbers. If 3, 4, or 5 of your scores match, a win record is created automatically.',
            },
            {
              step:  '2',
              icon:  '📸',
              title: 'Upload a screenshot as proof',
              body:  'To claim your prize, take a screenshot of your Scores page on GolfGives showing your 5 most recent Stableford scores. Upload it here — JPEG, PNG, or WebP, max 5 MB.',
            },
            {
              step:  '3',
              icon:  '🔍',
              title: 'Admin reviews your submission',
              body:  'Our team verifies that the screenshot matches the draw record. This typically takes 1–3 business days. Your status will update to "Verified" once approved.',
            },
            {
              step:  '4',
              icon:  '💸',
              title: 'Prize is paid out',
              body:  'Once verified, your prize is transferred to the payment method on your account. Your win status updates to "Paid" and the amount appears in your total.',
            },
          ].map(({ step, icon, title, body }) => (
            <li key={step} className="flex gap-3 md:gap-4">
              {/* Step number + connector line */}
              <div className="flex-shrink-0 flex flex-col items-center gap-1">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-green-100 text-green-800 font-black text-xs md:text-sm flex items-center justify-center">
                  {step}
                </div>
                {step !== '4' && (
                  <div className="w-px flex-1 bg-green-100 min-h-[16px]" aria-hidden="true" />
                )}
              </div>

              {/* Content */}
              <div className="pb-4 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span aria-hidden="true">{icon}</span>
                  <p className="text-xs md:text-sm font-semibold text-gray-900">{title}</p>
                </div>
                <p className="text-[10px] md:text-xs text-gray-500 leading-relaxed">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Winnings overview (subscription-gated) ───────────────────────── */}
      <section>
        <h2 className="text-sm md:text-base font-bold text-gray-900 mb-4">Your wins</h2>
        <SubscriptionGuard>
          <WinningsOverview />
        </SubscriptionGuard>
      </section>
    </div>
  )
}
