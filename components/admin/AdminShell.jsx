/**
 * @fileoverview Admin layout shell — client component.
 *
 * Red/dark colour scheme to distinguish from the member dashboard.
 * Renders the sidebar (desktop ≥ md) and bottom nav (mobile < md).
 *
 * @param {{
 *   user: { displayName: string, email: string, avatarUrl: string|null },
 *   children: React.ReactNode
 * }} props
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    href:  '/admin',
    label: 'Overview',
    short: 'Home',
    exact: true,
    icon: (
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
    href:  '/admin/users',
    label: 'Users',
    short: 'Users',
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href:  '/admin/draws',
    label: 'Draws',
    short: 'Draws',
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M12 6v12M2 12h20" />
      </svg>
    ),
  },
  {
    href:  '/admin/charities',
    label: 'Charities',
    short: 'Charity',
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
  },
  {
    href:  '/admin/winners',
    label: 'Winners',
    short: 'Winners',
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M6 9H4a2 2 0 000 4h2M18 9h2a2 2 0 010 4h-2" />
        <path d="M8 21h8M12 17v4M6 3h12v9a6 6 0 01-12 0V3z" />
      </svg>
    ),
  },
  {
    href:  '/admin/reports',
    label: 'Reports',
    short: 'Reports',
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 3v18h18" />
        <path d="M18 9l-5 5-4-4-4 4" />
      </svg>
    ),
  },
]

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ url, name, size = 'w-9 h-9' }) {
  if (url) {
    return (
            <Image src={url} alt={name} width={36} height={36}
        className={`${size} rounded-full object-cover flex-shrink-0`} />
    )
  }
  return (
    <div className={`${size} rounded-full bg-red-800 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {(name ?? 'A').charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export default function AdminShell({ user, children }) {
  const pathname   = usePathname()
  const router     = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  function isActive(item) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href)
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch {
      setSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* ── Sidebar (desktop ≥ md) ──────────────────────────────────────── */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0,   opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="hidden md:flex flex-col w-64 bg-red-950 min-h-screen sticky top-0 h-screen flex-shrink-0"
      >
        {/* Branding */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-red-900">
          <div className="w-7 h-7 rounded-lg bg-red-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-black text-white tracking-tight leading-none">Admin Panel</p>
            <p className="text-xs text-red-400 mt-0.5">GolfGives</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Admin navigation">
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
                    : 'text-red-300 hover:bg-white/5 hover:text-white',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                <span className={active ? 'text-white' : 'text-red-400'}>{item.icon}</span>
                {item.label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" aria-hidden="true" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User + sign out */}
        <div className="border-t border-red-900 px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar url={user.avatarUrl} name={user.displayName} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user.displayName}</p>
              <p className="text-[10px] text-red-400">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </motion.aside>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden bg-red-950 px-4 h-14 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-red-700 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="text-sm font-black text-white">Admin Panel</span>
          </div>
          <Avatar url={user.avatarUrl} name={user.displayName} size="w-8 h-8" />
        </header>

        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8 md:py-8 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── Bottom nav (mobile < md) ─────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-red-950 border-t border-red-900 z-30 flex"
        aria-label="Admin mobile navigation"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors',
                active ? 'text-orange-400' : 'text-red-500',
              ].join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              <span>{item.icon}</span>
              <span className="text-[9px] font-medium leading-none">{item.short}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
