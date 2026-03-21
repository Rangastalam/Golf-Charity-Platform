/**
 * @fileoverview Layout for auth routes: /login, /signup
 * Centred, minimal layout with a golf brand header.
 */

import Link from 'next/link'

export const metadata = {
  title: {
    template: '%s | GolfGives',
    default: 'GolfGives',
  },
}

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-green-950 flex flex-col items-center justify-center px-4">
      {/* Brand mark */}
      <Link href="/" className="mb-8 flex flex-col items-center gap-2">
        <span className="text-3xl font-bold text-white tracking-tight">
          Golf<span className="text-yellow-400">Gives</span>
        </span>
        <span className="text-green-300 text-sm font-medium">
          Play golf. Support charity. Win prizes.
        </span>
      </Link>

      {/* Auth card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        {children}
      </div>

      <p className="mt-6 text-green-400 text-xs text-center">
        &copy; {new Date().getFullYear()} GolfGives. All rights reserved.
      </p>
    </div>
  )
}
