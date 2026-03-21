/**
 * @fileoverview Site-wide footer — three-column layout, dark theme.
 */

import Link from 'next/link'
import { ROUTES } from '@/constants'

const COLUMNS = [
  {
    heading: 'Platform',
    links: [
      { href: ROUTES.HOW_IT_WORKS, label: 'How It Works' },
      { href: ROUTES.PRICING,      label: 'Pricing'      },
      { href: ROUTES.CHARITIES,    label: 'Charities'    },
    ],
  },
  {
    heading: 'Account',
    links: [
      { href: ROUTES.LOGIN,      label: 'Login'     },
      { href: ROUTES.SIGNUP,     label: 'Sign Up'   },
      { href: ROUTES.DASHBOARD,  label: 'Dashboard' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms',   label: 'Terms of Service' },
      { href: '/cookies', label: 'Cookie Policy'  },
    ],
  },
]

const SOCIAL = [
  { label: 'Twitter',   href: '#', icon: 'X'  },
  { label: 'Instagram', href: '#', icon: 'IG' },
  { label: 'LinkedIn',  href: '#', icon: 'IN' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-gray-950 border-t border-gray-800/60">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-14 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href={ROUTES.HOME} className="inline-block mb-3">
              <span className="text-xl font-black text-white">
                Golf<span className="text-amber-400">Gives</span>
              </span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              A subscription platform where every round of golf funds real charities and offers real prizes — every month.
            </p>
            {/* Social links */}
            <div className="flex gap-3 mt-5">
              {SOCIAL.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 hover:text-white transition-colors"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map(({ heading, links }) => (
            <div key={heading}>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                {heading}
              </h3>
              <ul className="space-y-3">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Impact statement + copyright */}
        <div className="border-t border-gray-800/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600 text-center sm:text-left">
            40% of every subscription goes directly to verified charities. 40% funds your prize pool.
          </p>
          <p className="text-xs text-gray-700 text-center sm:text-right flex-shrink-0">
            © {year} GolfGives · Built by Digital Heroes
          </p>
        </div>
      </div>
    </footer>
  )
}
