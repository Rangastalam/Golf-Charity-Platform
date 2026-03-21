/**
 * @fileoverview Dashboard top navigation bar with user info and sign-out.
 *
 * @param {{ user: { id: string, email: string, displayName: string, avatarUrl: string|null, tierId: string|null } }} props
 */

'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ROUTES, SUBSCRIPTION_TIERS } from '@/constants'

const NAV_LINKS = [
  { href: ROUTES.DASHBOARD, label: 'Overview' },
  { href: `${ROUTES.DASHBOARD}/scores`, label: 'Scores' },
  { href: `${ROUTES.DASHBOARD}/draws`, label: 'Draws' },
  { href: `${ROUTES.DASHBOARD}/subscription`, label: 'Subscription' },
]

/**
 * @param {{ user: Object }} props
 */
export default function DashboardNav({ user }) {
  const router = useRouter()
  const pathname = usePathname()
  const [signingOut, setSigningOut] = useState(false)

  const tier = user.tierId
    ? Object.values(SUBSCRIPTION_TIERS).find((t) => t.id === user.tierId)
    : null

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      router.push(ROUTES.HOME)
      router.refresh()
    } catch (err) {
      console.error('Sign out error:', err)
      setSigningOut(false)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link href={ROUTES.HOME} className="text-lg font-bold text-green-900">
            Golf<span className="text-yellow-500">Gives</span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'bg-green-50 text-green-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* User info + sign out */}
          <div className="flex items-center gap-3">
            {tier && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                {tier.name}
              </span>
            )}

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-700 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm text-gray-700 font-medium max-w-[140px] truncate">
                {user.displayName}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-xs text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
