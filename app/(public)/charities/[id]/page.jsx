/**
 * @fileoverview Individual charity profile page.
 *
 * Server component — fetches charity + events SSR.
 * Includes hero image, full description, upcoming events,
 * "Support" CTA, independent donation form.
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import CharityProfileClient from './CharityProfileClient'

/**
 * @param {{ params: Promise<{ id: string }> }} props
 */
export async function generateMetadata({ params }) {
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('charities')
    .select('name, description')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) return { title: 'Charity Not Found' }
  return {
    title: data.name,
    description: data.description ?? undefined,
  }
}

/**
 * @param {{ params: Promise<{ id: string }> }} props
 */
export default async function CharityProfilePage({ params }) {
  const { id } = await params

  // Check auth (optional — affects CTA button text only)
  const cookieStore = await cookies()
  const supabase = createServerSupabaseClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: charity, error } = await supabaseAdmin
    .from('charities')
    .select(
      `id, name, description, image_url, website_url, is_featured, created_at,
       charity_events ( id, title, description, event_date, created_at )`
    )
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('CharityProfilePage DB error:', error)
  }

  if (!charity) {
    notFound()
  }

  const today = new Date().toISOString().slice(0, 10)
  const upcomingEvents = (charity.charity_events ?? [])
    .filter((e) => e.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))

  const pastEvents = (charity.charity_events ?? [])
    .filter((e) => e.event_date < today)
    .sort((a, b) => b.event_date.localeCompare(a.event_date))
    .slice(0, 3)

  return (
    <div className="bg-white min-h-screen">
      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <nav className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-2" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/charities" className="hover:text-green-700 transition-colors">
              Our Charities
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-900 font-medium truncate max-w-xs">{charity.name}</li>
        </ol>
      </nav>

      {/* ── Hero image ──────────────────────────────────────────────────── */}
      <div className="relative w-full h-64 sm:h-80 bg-green-50 overflow-hidden">
        {charity.image_url ? (
          <Image
            src={charity.image_url}
            alt={charity.name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-green-900">
            <span className="text-8xl" aria-hidden="true">🤝</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Title on image */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-5xl mx-auto">
            {charity.is_featured && (
              <span className="inline-block bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full mb-2">
                Featured Partner
              </span>
            )}
            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              {charity.name}
            </h1>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left column — description + events */}
        <div className="lg:col-span-2 space-y-10">
          {/* Description */}
          {charity.description && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">About</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {charity.description}
              </p>
            </section>
          )}

          {/* Upcoming events */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Upcoming Events
              {upcomingEvents.length > 0 && (
                <span className="ml-2 text-sm font-normal text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                  {upcomingEvents.length}
                </span>
              )}
            </h2>

            {upcomingEvents.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-6 text-center">
                <p className="text-gray-500 text-sm">No upcoming events scheduled.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {upcomingEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex gap-4 bg-green-50 rounded-2xl p-4 border border-green-100"
                  >
                    <div className="flex-shrink-0 w-14 text-center">
                      <EventDateBadge date={event.event_date} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{event.title}</p>
                      {event.description && (
                        <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Past events (last 3) */}
          {pastEvents.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 text-gray-400">
                Past Events
              </h2>
              <ul className="space-y-2">
                {pastEvents.map((event) => (
                  <li key={event.id} className="flex gap-3 items-center text-sm text-gray-400">
                    <span className="font-mono text-xs">
                      {new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="truncate">{event.title}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Right column — action panel */}
        <div className="space-y-4">
          {/* Support CTA */}
          <div className="bg-green-950 rounded-2xl p-6 text-white">
            <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Support this charity
            </p>
            <p className="text-sm text-green-200 mb-5 leading-relaxed">
              Select this charity as your monthly recipient and a portion of your
              subscription will be donated automatically every month.
            </p>
            {user ? (
              <Link
                href="/dashboard"
                className="block text-center bg-white text-green-950 font-bold rounded-xl py-3 text-sm hover:bg-green-50 transition-colors"
              >
                Choose this charity →
              </Link>
            ) : (
              <Link
                href="/signup"
                className="block text-center bg-white text-green-950 font-bold rounded-xl py-3 text-sm hover:bg-green-50 transition-colors"
              >
                Sign up to support →
              </Link>
            )}
            {charity.website_url && (
              <a
                href={charity.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-green-400 hover:text-white text-xs mt-3 transition-colors"
              >
                Visit charity website ↗
              </a>
            )}
          </div>

          {/* Independent donation (client component) */}
          {user && (
            <CharityProfileClient charityId={charity.id} charityName={charity.name} />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Small date badge showing abbreviated month + day.
 *
 * @param {{ date: string }} props  date is 'YYYY-MM-DD'
 */
function EventDateBadge({ date }) {
  const d = new Date(date + 'T00:00:00')
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const day   = d.getDate()

  return (
    <div className="bg-white border border-green-200 rounded-xl text-center py-1.5">
      <p className="text-green-600 text-xs font-bold leading-none">{month}</p>
      <p className="text-gray-900 text-lg font-black leading-tight">{day}</p>
    </div>
  )
}
