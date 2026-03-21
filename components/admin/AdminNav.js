/**
 * @fileoverview Admin sidebar navigation.
 *
 * @param {{ adminEmail: string }} props
 */

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/constants'

const NAV_ITEMS = [
  { href: ROUTES.ADMIN, label: 'Overview', icon: '📊' },
  { href: `${ROUTES.ADMIN}/members`, label: 'Members', icon: '👥' },
  { href: `${ROUTES.ADMIN}/draws`, label: 'Draws', icon: '🎰' },
  { href: `${ROUTES.ADMIN}/charities`, label: 'Charities', icon: '💚' },
  { href: `${ROUTES.ADMIN}/scores`, label: 'Scores', icon: '⛳' },
]

/**
 * @param {{ adminEmail: string }} props
 */
export default function AdminNav({ adminEmail }) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

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
    <aside className="w-60 bg-gray-950 border-r border-gray-800 flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-800">
        <Link href={ROUTES.HOME} className="text-lg font-bold text-white">
          Golf<span className="text-yellow-400">Gives</span>
        </Link>
        <span className="ml-2 text-xs font-semibold text-yellow-400 bg-yellow-400/10 rounded px-1.5 py-0.5">
          Admin
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === href
                ? 'bg-green-900/60 text-green-300'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <span className="text-base">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>

      {/* User + sign out */}
      <div className="px-5 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 truncate mb-2">{adminEmail}</p>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-xs text-gray-500 hover:text-white transition-colors disabled:opacity-50"
        >
          {signingOut ? 'Signing out…' : '← Sign out'}
        </button>
      </div>
    </aside>
  )
}
