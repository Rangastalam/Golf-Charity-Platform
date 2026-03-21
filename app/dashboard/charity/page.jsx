/**
 * @fileoverview Dashboard charity management page — server component.
 *
 * Displays:
 *   - Current charity selection with contribution percentage
 *   - CharitySelector to browse and change charity
 *   - Donation history (both subscription-allocated and independent)
 *   - Cumulative impact summary
 */

import { cookies } from 'next/headers'

import { getCurrentUser }             from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import CharitySelector                from '@/components/dashboard/CharitySelector'
import { ROUTES }                     from '@/constants'
import Link                           from 'next/link'

// ─── Data helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the user's current charity selection with charity details.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function fetchCurrentSelection(supabase, userId) {
  const { data } = await supabase
    .from('user_charity_selections')
    .select(`
      contribution_percentage,
      updated_at,
      charities(
        id, name, description, image_url, website_url, is_featured
      )
    `)
    .eq('user_id', userId)
    .maybeSingle()

  return data ?? null
}

/**
 * Returns the user's last 20 charity contributions across all types.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function fetchDonationHistory(supabase, userId) {
  const { data } = await supabase
    .from('charity_contributions')
    .select('id, amount, percentage, is_independent, created_at, charities(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  return data ?? []
}

/**
 * Returns the total amount donated across all charities.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function fetchTotalDonated(supabase, userId) {
  const { data } = await supabase
    .from('charity_contributions')
    .select('amount')
    .eq('user_id', userId)

  if (!data || data.length === 0) return 0
  return data.reduce((sum, row) => sum + (row.amount ?? 0), 0)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const metadata = { title: 'My Charity — GolfGives' }

export default async function CharityPage() {
  const cookieStore = await cookies()
  const auth        = await getCurrentUser(cookieStore)

  if (!auth) return null

  const { user } = auth
  const supabase  = createServerSupabaseClient(cookieStore)

  const [selection, donations, totalDonated] = await Promise.all([
    fetchCurrentSelection(supabase, user.id),
    fetchDonationHistory(supabase, user.id),
    fetchTotalDonated(supabase, user.id),
  ])

  const charity = selection?.charities

  return (
    <div className="space-y-6 md:space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-gray-900">My Charity</h1>
        <p className="text-xs md:text-sm text-gray-500 mt-1">
          A portion of every subscription payment goes directly to the charity you choose.
        </p>
      </div>

      {/* Current selection + selector — stacked on mobile, side-by-side on lg */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Current selection */}
        <div className="flex-1">
          {charity ? (
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-full">
              {charity.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={charity.image_url}
                  alt={charity.name}
                  className="w-full h-28 md:h-32 object-cover"
                />
              )}
              <div className="p-4 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {charity.is_featured && (
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mb-2 inline-block">
                        Featured
                      </span>
                    )}
                    <h2 className="text-base md:text-lg font-black text-gray-900">{charity.name}</h2>
                    {charity.description && (
                      <p className="text-xs md:text-sm text-gray-500 mt-1 line-clamp-2">
                        {charity.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl md:text-3xl font-black text-green-700">
                      {selection.contribution_percentage}%
                    </p>
                    <p className="text-xs text-gray-400">of your sub</p>
                  </div>
                </div>

                {charity.website_url && (
                  <a
                    href={charity.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-900 mt-3 transition-colors"
                  >
                    Visit website ↗
                  </a>
                )}
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 md:p-8 text-center h-full flex flex-col items-center justify-center">
              <p className="text-3xl mb-3">❤️</p>
              <h2 className="text-sm md:text-base font-bold text-gray-800">No charity selected</h2>
              <p className="text-xs md:text-sm text-gray-500 mt-1">
                Choose a charity below and a percentage of your subscription will go directly to them.
              </p>
            </section>
          )}
        </div>

        {/* Charity selector — client component */}
        <div className="flex-1">
          <h2 className="text-sm md:text-base font-bold text-gray-900 mb-3">
            {charity ? 'Change Charity' : 'Choose Your Charity'}
          </h2>
          <CharitySelector currentCharityId={charity?.id ?? null} />
        </div>
      </div>

      {/* Impact summary */}
      {totalDonated > 0 && (
        <section className="bg-green-950 rounded-2xl p-4 md:p-6 text-white">
          <h2 className="text-xs md:text-sm font-bold mb-1 text-green-300 uppercase tracking-wider">
            Your impact
          </h2>
          <p className="text-3xl md:text-4xl font-black text-white">
            ₹{totalDonated.toLocaleString('en-IN')}
          </p>
          <p className="text-xs md:text-sm text-green-300 mt-1">
            Total donated across all charities
          </p>
        </section>
      )}

      {/* Donation history */}
      {donations.length > 0 && (
        <section>
          <h2 className="text-sm md:text-base font-bold text-gray-900 mb-4">Donation History</h2>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {donations.map((donation) => {
              const date = new Date(donation.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })
              return (
                <div
                  key={donation.id}
                  className="flex items-center justify-between px-4 md:px-5 py-3 md:py-3.5 gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-semibold text-gray-900 truncate">
                      {donation.charities?.name ?? 'Charity'}
                    </p>
                    <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">
                      {donation.is_independent ? 'One-time donation' : `${donation.percentage}% allocation`}
                      {' · '}{date}
                    </p>
                  </div>
                  <p className="text-xs md:text-sm font-black text-green-700 flex-shrink-0">
                    ₹{(donation.amount ?? 0).toLocaleString('en-IN')}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* One-time donation CTA */}
      <section className="text-center py-2">
        <p className="text-xs md:text-sm text-gray-500 mb-3">
          Want to give more? Make a one-time donation to any charity.
        </p>
        <Link
          href={ROUTES.CHARITIES}
          className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl hover:border-green-300 hover:text-green-800 transition-colors min-h-[44px]"
        >
          Browse charities →
        </Link>
      </section>
    </div>
  )
}
