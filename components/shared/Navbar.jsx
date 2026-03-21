/**
 * @fileoverview Site-wide navigation bar — client component.
 *
 * - Transparent on homepage hero, solid on scroll / other pages.
 * - Mobile hamburger with Framer Motion slide-out drawer.
 * - Auth state via Supabase browser client.
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/constants'

const NAV_LINKS = [
  { href: ROUTES.HOW_IT_WORKS, label: 'How It Works' },
  { href: ROUTES.CHARITIES,    label: 'Charities'    },
  { href: ROUTES.PRICING,      label: 'Pricing'      },
]

export default function Navbar() {
  const pathname   = usePathname()
  const router     = useRouter()
  const isHome     = pathname === '/'

  const [scrolled,   setScrolled]   = useState(false)
  const [user,       setUser]       = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // ─── Scroll detection ─────────────────────────────────────────────────────
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 48) }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ─── Auth state ───────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ─── Body scroll lock when drawer open ───────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      router.push(ROUTES.HOME)
      router.refresh()
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setSigningOut(false)
    }
  }

  const transparent = isHome && !scrolled
  const bg = transparent
    ? 'bg-transparent'
    : 'bg-gray-950/95 backdrop-blur-md border-b border-gray-800/60'

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${bg}`}>
        <nav className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href={ROUTES.HOME} className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xl font-black text-white tracking-tight">
              Golf<span className="text-amber-400">Gives</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={[
                  'text-sm font-medium transition-colors',
                  pathname === href ? 'text-white' : 'text-gray-400 hover:text-white',
                ].join(' ')}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop auth CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href={ROUTES.DASHBOARD}
                  className="text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="text-sm font-semibold text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </>
            ) : (
              <>
                <Link
                  href={ROUTES.LOGIN}
                  className="text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  href={ROUTES.SIGNUP}
                  className="text-sm font-black bg-amber-400 hover:bg-amber-300 text-gray-950 px-4 py-2 rounded-xl transition-colors min-h-[36px] flex items-center"
                >
                  Subscribe
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden flex flex-col gap-1.5 p-2 min-h-[44px] min-w-[44px] items-center justify-center"
            aria-label="Open menu"
          >
            <span className={`w-5 h-0.5 bg-white transition-all`} />
            <span className={`w-5 h-0.5 bg-white transition-all`} />
            <span className={`w-3 h-0.5 bg-white transition-all self-end`} />
          </button>
        </nav>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer panel */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-gray-950 border-l border-gray-800 flex flex-col md:hidden"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 h-16 border-b border-gray-800">
                <span className="text-lg font-black text-white">
                  Golf<span className="text-amber-400">Gives</span>
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="text-gray-400 hover:text-white text-xl w-10 h-10 flex items-center justify-center"
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              {/* Drawer nav links */}
              <nav className="flex-1 px-5 py-6 space-y-1">
                {NAV_LINKS.map(({ href, label }, i) => (
                  <motion.div
                    key={href}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link
                      href={href}
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center py-3 text-sm font-semibold text-gray-300 hover:text-white transition-colors border-b border-gray-800/50"
                    >
                      {label}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              {/* Drawer auth CTAs */}
              <div className="px-5 pb-8 space-y-3">
                {user ? (
                  <>
                    <Link
                      href={ROUTES.DASHBOARD}
                      onClick={() => setDrawerOpen(false)}
                      className="w-full flex items-center justify-center bg-gray-800 text-white text-sm font-semibold py-3 rounded-xl min-h-[44px]"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="w-full text-sm text-gray-400 py-2 disabled:opacity-50"
                    >
                      {signingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href={ROUTES.SIGNUP}
                      onClick={() => setDrawerOpen(false)}
                      className="w-full flex items-center justify-center bg-amber-400 text-gray-950 text-sm font-black py-3 rounded-xl min-h-[44px]"
                    >
                      Subscribe Now
                    </Link>
                    <Link
                      href={ROUTES.LOGIN}
                      onClick={() => setDrawerOpen(false)}
                      className="w-full flex items-center justify-center border border-gray-700 text-gray-300 text-sm font-semibold py-3 rounded-xl min-h-[44px]"
                    >
                      Login
                    </Link>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
