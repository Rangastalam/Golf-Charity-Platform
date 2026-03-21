/**
 * @fileoverview Dashboard layout shell — client component.
 *
 * Renders the sidebar (desktop ≥ md) and bottom navigation (mobile < md)
 * around the page content. Receives user + subscription data as props from
 * the server-rendered layout.
 *
 * @param {{
 *   user: { id: string, email: string, displayName: string, avatarUrl: string|null },
 *   subscriptionStatus: string|null,
 *   children: React.ReactNode
 * }} props
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/constants'

// ─── Navigation items ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    href:  ROUTES.DASHBOARD,
    label: 'Overview',
    short: 'Home',
    exact: true,
    icon:  (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href:  `${ROUTES.DASHBOARD}/scores`,
    label: 'My Scores',
    short: 'Scores',
    exact: false,
    icon:  (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-4 4 4 4-6" />
      </svg>
    ),
  },
  {
    href:  `${ROUTES.DASHBOARD}/draws`,
    label: 'Draw & Prizes',
    short: 'Draws',
    exact: false,
    icon:  (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M12 6v12M2 12h20" />
      </svg>
    ),
  },
  {
    href:  `${ROUTES.DASHBOARD}/charity`,
    label: 'My Charity',
    short: 'Charity',
    exact: false,
    icon:  (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
  },
  {
    href:  `${ROUTES.DASHBOARD}/settings`,
    label: 'Settings',
    short: 'Settings',
    exact: false,
    icon:  (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
]

// ─── Status badge ─────────────────────────────────────────────────────────────

/**
 * @param {{ status: string|null }} props
 */
function SubStatusBadge({ status }) {
  if (!status) return null

  const map = {
    active:    'bg-green-500/20 text-green-300',
    lapsed:    'bg-red-500/20   text-red-300',
    inactive:  'bg-gray-500/20  text-gray-400',
    cancelled: 'bg-gray-500/20  text-gray-400',
  }
  const labels = {
    active:    'Active',
    lapsed:    'Lapsed',
    inactive:  'Inactive',
    cancelled: 'Cancelled',
  }

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] ?? map.inactive}`}>
      {labels[status] ?? status}
    </span>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ url, name, size = 'w-9 h-9' }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={`${size} rounded-full object-cover flex-shrink-0`}
      />
    )
  }
  return (
    <div
      className={`${size} rounded-full bg-green-700 flex items-center justify-center text-white font-bold flex-shrink-0`}
      aria-hidden="true"
    >
      {(name ?? '?').charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Main shell ───────────────────────────────────────────────────────────────

/**
 * @param {{ user: object, subscriptionStatus: string|null, children: React.ReactNode }} props
 */
export default function DashboardShell({ user, subscriptionStatus, children }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [signingOut, setSigningOut] = useState(false)

  function isActive(item) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href)
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      router.push(ROUTES.HOME)
      router.refresh()
    } catch {
      setSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Sidebar (desktop ≥ md) ─────────────────────────────────────── */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0,   opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="hidden md:flex flex-col w-64 bg-green-950 min-h-screen sticky top-0 h-screen flex-shrink-0"
      >
        {/* Logo */}
        <Link
          href={ROUTES.HOME}
          className="flex items-center gap-2 px-5 py-5 border-b border-green-900"
        >
          <span className="text-lg font-black text-white tracking-tight">
            Golf<span className="text-yellow-400">Gives</span>
          </span>
        </Link>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Dashboard">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-green-300 hover:bg-white/5 hover:text-white',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                <span className={active ? 'text-white' : 'text-green-400'}>
                  {item.icon}
                </span>
                {item.label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-400" aria-hidden="true" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User info + sign out */}
        <div className="border-t border-green-900 px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar url={user.avatarUrl} name={user.displayName} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {user.displayName}
              </p>
              <SubStatusBadge status={subscriptionStatus} />
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-green-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </motion.aside>

      {/* ── Page content ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between sticky top-0 z-30">
          <Link href={ROUTES.HOME} className="text-base font-black text-green-900">
            Golf<span className="text-yellow-500">Gives</span>
          </Link>
          <div className="flex items-center gap-2">
            <SubStatusBadge status={subscriptionStatus} />
            <Avatar url={user.avatarUrl} name={user.displayName} size="w-8 h-8" />
          </div>
        </header>

        {/* Main content — pb-20 on mobile to clear the fixed bottom nav */}
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8 md:py-8 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── Bottom nav (mobile < md) ───────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 flex"
        aria-label="Mobile navigation"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors',
                active ? 'text-green-700' : 'text-gray-400',
              ].join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              <span className={active ? 'text-green-700' : 'text-gray-400'}>
                {item.icon}
              </span>
              <span className="text-[10px] font-medium leading-none">{item.short}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
